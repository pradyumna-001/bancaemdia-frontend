"""Native-currency accounts, bets and totals in Caixa through the real SPA (#128)."""

import asyncio
import importlib.util
import json
import os
import re
import secrets
import subprocess
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_native_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
ACCOUNTS = "/api/v1/financeiro/nativo/contas"
SUMMARY = "/api/v1/financeiro/nativo/resumo"
BETS = "/api/v1/financeiro/nativo/apostas"


@lru_cache
def native(value, currency, sign=False):
    # The single formatter of src/lib/format.ts, never a local conversion.
    source = json.dumps((core.helpers.ROOT / "src/lib/format.ts").as_uri())
    program = (
        f"import {{valorNativo}} from {source};"
        "let input='';for await(const chunk of process.stdin)input+=chunk;"
        "const [v,c,s]=JSON.parse(input);process.stdout.write(valorNativo(v,c,s));"
    )
    return subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", program],
        input=json.dumps([value, currency, sign]),
        capture_output=True,
        check=True,
        encoding="utf8",
    ).stdout


async def settled(page):
    # Sections load independently; act only after every query answered.
    await expect(page.get_by_text(re.compile(r"^Consultando"))).to_have_count(0)


async def create_account(page, section, label):
    await section.get_by_role("button", name="Conta em outra moeda").click()
    await section.get_by_role("button", name=re.compile("^Casa ")).click()
    await page.get_by_role("button", name="Betano", exact=True).click()
    await section.get_by_label("USDT").check()
    await section.get_by_label("Apelido").fill(label)
    await section.get_by_label("Início da vigência (com fuso)").fill(
        "01/10/2026 00:00-03:00"
    )


async def seed_bets(engine, uid, account):
    # Real rows under the owner's RLS and the API's own triggers; the totals
    # and the list below are computed by the API, never by the test.
    rows = [
        (account, "GREEN", "10.5", "19.845000000000000000000000000001", False),
        (None, "RED", "4", "0", True),
    ]
    async with engine.begin() as conn:
        await conn.execute(
            text("SELECT set_config('app.current_user_id',:uid,true)"),
            {"uid": str(uid)},
        )
        for index, (acc, state, stake, returned, review) in enumerate(rows):
            await conn.execute(
                text(
                    "INSERT INTO native_bets(usuario_id,account_id,currency,identity_hash,"
                    "canonical_hash,source_hash,state,stake,returned,game_at,placed_at,"
                    "needs_review,canonical) VALUES(:uid,:acc,'USDT',:i,:c,:s,:state,"
                    "CAST(:stake AS numeric),CAST(:ret AS numeric),CAST(:game AS timestamptz),"
                    "CAST(:placed AS timestamptz),:review,"
                    "CAST('{}' AS jsonb))"
                ),
                {
                    "uid": uid,
                    "acc": acc,
                    "i": secrets.token_hex(32),
                    "c": secrets.token_hex(32),
                    "s": secrets.token_hex(32),
                    "state": state,
                    # asyncpg binds typed values: exact Decimal and aware datetime.
                    "stake": Decimal(stake),
                    "ret": Decimal(returned),
                    "game": datetime(2026, 10, 10 + index, 18, tzinfo=timezone.utc),
                    "placed": datetime(2026, 10, 10 + index, 12, tzinfo=timezone.utc),
                    "review": review,
                },
            )


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_nativo(harness, engine_admin, viewport, browser_name):
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        other_context = await browser.new_context(viewport=viewport)
        page, other = await context.new_page(), await other_context.new_page()
        user, _ = await core.backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        uid = user["usuario_id"]
        expiry = await core.grant(page, engine_admin, uid, seconds=240)
        seeded = await core.seed(page, engine_admin, uid)
        await core.backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"nativo-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            address = core.backend.FRONT + f"/banca?casa={seeded['house']}"
            await page.goto(address)
            await settled(page)
            section = page.get_by_role("region", name="Outras moedas", exact=True)
            await expect(section).to_contain_text("Nenhuma conta em outra moeda")
            await expect(section).to_contain_text(
                "Ainda não há apostas em outras moedas nos totais."
            )

            # Account creation, exact request, real row.
            await create_account(page, section, "1win USDT real")
            async with page.expect_response(
                lambda r: (
                    r.request.method == "POST"
                    and r.url.endswith(ACCOUNTS)
                    and r.status == 201
                )
            ) as created:
                await section.get_by_role("button", name="Criar conta").click()
            account = await (await created.value).json()
            assert (
                account["currency"] == "USDT" and account["casa_id"] == seeded["house"]
            )
            await expect(section).to_contain_text(
                "Conta 1win USDT real em USDT criada."
            )
            async with engine_admin.connect() as conn:
                await conn.execute(
                    text("SELECT set_config('app.current_user_id',:uid,false)"),
                    {"uid": str(uid)},
                )
                stored = await conn.scalar(
                    text("SELECT count(*) FROM native_accounts WHERE usuario_id=:uid"),
                    {"uid": uid},
                )
            assert stored == 1

            # Native bets: totals and list come from the API, in USDT, exact.
            await seed_bets(engine_admin, uid, account["id"])
            await page.goto(address)
            await settled(page)
            summary = await core.read(page, SUMMARY)
            assert summary["combined_monetary_total"] is None
            assert [t["currency"] for t in summary["totals_by_currency"]] == ["USDT"]
            total = summary["totals_by_currency"][0]
            assert total["bets"] == 1, "The bet in review stays out of the totals"
            table = section.get_by_role("table")
            await expect(table).to_contain_text(native(total["stake"], "USDT"))
            await expect(table).to_contain_text(native(total["profit"], "USDT", True))
            bets = await core.read(page, BETS + "?limit=20")
            review = next(b for b in bets if b["needs_review"])
            card = section.get_by_role("article", name=f"Aposta {review['id']}")
            await expect(card).to_contain_text("Sem conta atribuída")
            await expect(card).to_contain_text("fica fora dos totais")
            await expect(card).to_contain_text(native(review["stake"], "USDT"))
            await expect(section).not_to_contain_text("R$")

            # Lost answer after the real commit: no retry, list does not confirm.
            sends, statuses = [], []
            committed = asyncio.Event()
            loop = asyncio.get_running_loop()

            def observe(request):
                if request.method == "POST" and request.url.endswith(ACCOUNTS):
                    sends.append(True)

            def lose_response(method, path, response):
                if method != "POST" or path != ACCOUNTS:
                    return False
                statuses.append(response.status_code)
                loop.call_soon_threadsafe(committed.set)
                return len(statuses) == 1

            page.on("request", observe)
            harness.frontend_proxy.after_api_response = lose_response
            await create_account(page, section, "Conta perdida")
            await section.get_by_role("button", name="Criar conta").click()
            await asyncio.wait_for(committed.wait(), timeout=30)
            await expect(
                section.get_by_text("Não foi possível confirmar", exact=False)
            ).to_be_visible()
            harness.frontend_proxy.after_api_response = None
            await section.get_by_role("button", name="Consultar contas").click()
            await expect(section).to_contain_text(
                "Lista consultada. Ela não confirma o resultado daquele pedido."
            )
            assert statuses == [201] and len(sends) == 1
            await section.get_by_role(
                "button", name="Encerrar este acompanhamento"
            ).click()
            assert len(sends) == 1

            for theme in ("claro", "escuro"):
                await page.evaluate(
                    "async () => { window.scrollTo(0,0); await document.fonts.ready; }"
                )
                await page.evaluate(
                    "value => document.documentElement.dataset.tema=value", theme
                )
                await core.accessibility(page)
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"nativo-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )
            await page.set_viewport_size({"width": 320, "height": 844})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= window.innerWidth"
            ), "Outras moedas must reflow at 320 px without horizontal scroll"
            await page.set_viewport_size(viewport)

            # Isolation: the other owner sees no account and no totals.
            await other.goto(core.backend.FRONT + "/banca")
            await settled(other)
            other_section = other.get_by_role(
                "region", name="Outras moedas", exact=True
            )
            await expect(other_section).to_contain_text("Nenhuma conta em outra moeda")
            assert await core.read(other, ACCOUNTS) == []
            assert (await core.read(other, SUMMARY))["totals_by_currency"] == []

            # READ_ONLY keeps every read and blocks account creation.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await core.fresh_session(page)
            assert (await core.read(page, "/api/v1/billing/status"))[
                "access"
            ] == "READ_ONLY"
            await page.goto(address)
            await settled(page)
            await expect(section.get_by_role("table")).to_contain_text("USDT")
            await expect(
                section.get_by_role("button", name="Conta em outra moeda")
            ).to_be_disabled()
            await expect(section).to_contain_text("podem ser consultadas")
            assert len(sends) == 1
            assert await page.locator("select,input[type=date]").count() == 0
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída").click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert await page.get_by_text("1win USDT real").count() == 0
        except Exception:
            try:
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"nativo-{browser_name}-{viewport['width']}-failure.png"
                    ),
                    full_page=True,
                )
            except BrowserError:
                pass
            raise
        finally:
            harness.frontend_proxy.after_api_response = None
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await other_context.close()
            await browser.close()
