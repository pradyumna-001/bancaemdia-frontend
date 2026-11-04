"""Unit value in force and its history through the real public SPA and API (#123)."""

import asyncio
import importlib.util
import json
import os
import secrets
import subprocess
import sys
import time
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_unit_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
UNIT = "/api/v1/unidade"
CHANGES = "/api/v1/unidade/vigencias"
BETS = (
    "SELECT chave,stake_centavos,valor_aposta_centavos,retorno_centavos,conta_casa_id "
    "FROM apostas WHERE usuario_id=:uid ORDER BY chave"
)


@lru_cache
def money(cents):
    # The single formatter of src/lib/format.ts, never a local conversion.
    source = json.dumps((core.helpers.ROOT / "src/lib/format.ts").as_uri())
    program = (
        f"import {{moeda}} from {source};"
        "let input='';for await(const chunk of process.stdin)input+=chunk;"
        "process.stdout.write(moeda(JSON.parse(input)));"
    )
    return subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", program],
        input=json.dumps(cents),
        capture_output=True,
        check=True,
        encoding="utf8",
    ).stdout


async def review(page, value):
    field = page.get_by_label("Nova unidade (R$)", exact=True)
    await expect(field).to_be_enabled()
    await field.fill(value)
    await page.get_by_role("button", name="Revisar nova unidade", exact=True).click()
    dialog = page.get_by_role("dialog", name="Salvar nova unidade?")
    await expect(dialog).to_be_visible()
    return dialog


async def unit_rows(engine, uid):
    async with engine.connect() as conn:
        return list(
            await conn.execute(
                text(
                    "SELECT valor_centavos,vigente_ate IS NULL FROM unidades "
                    "WHERE usuario_id=:uid ORDER BY vigente_de"
                ),
                {"uid": uid},
            )
        )


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_unidade(harness, engine_admin, viewport, browser_name):
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
        expiry = await core.grant(page, engine_admin, uid, seconds=180)
        seeded = await core.seed(page, engine_admin, uid)
        await core.backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        async with engine_admin.connect() as conn:
            before = list(await conn.execute(text(BETS), {"uid": uid}))
        assert before, "The seeded bets prove the change does not rewrite them"
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"unidade-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            address = (
                core.backend.FRONT + f"/configuracoes?casa={seeded['house']}&apagadas=1"
            )
            initial = await core.read(page, UNIT)
            assert initial["vigente"]["origem"] == "padrao"
            assert initial["historico"] == []
            await page.goto(address)
            card = page.get_by_role("region", name="Valor da unidade")
            await expect(card).to_contain_text(
                money(initial["vigente"]["valor_centavos"])
            )
            await expect(card).to_contain_text("valor padrão do serviço")
            await expect(card).to_contain_text(
                "Limite: " + money(initial["limite_centavos"])
            )
            await expect(card.get_by_role("table")).to_have_count(0)

            # Escape cancels without sending and returns focus to the trigger.
            sends = []
            page.on(
                "request",
                lambda request: (
                    sends.append(True)
                    if request.method == "POST" and request.url.endswith(CHANGES)
                    else None
                ),
            )
            dialog = await review(page, "25,50")
            await expect(dialog).to_contain_text(money(2550))
            await page.keyboard.press("Escape")
            await expect(dialog).not_to_be_visible()
            await expect(
                page.get_by_role("button", name="Revisar nova unidade")
            ).to_be_focused()
            assert sends == []

            dialog = await review(page, "25,50")
            async with page.expect_response(
                lambda r: (
                    r.request.method == "POST"
                    and r.url.endswith(CHANGES)
                    and r.status == 201
                )
            ) as created:
                await dialog.get_by_role(
                    "button", name="Salvar unidade", exact=True
                ).click()
            response = await created.value
            assert response.request.headers.get("idempotency-key")
            receipt = await response.json()
            assert receipt["vigencia"]["valor_centavos"] == 2550
            assert receipt["apostas_existentes_alteradas"] == 0
            await expect(card).to_contain_text("Unidade de " + money(2550) + " salva.")
            await expect(card).to_contain_text("nenhuma aposta existente foi alterada")
            history = card.get_by_role("table", name="Histórico de unidades")
            await expect(history).to_contain_text(money(2550))
            await expect(history).to_contain_text("Em vigor")
            current = await core.read(page, UNIT)
            assert current["vigente"]["valor_centavos"] == 2550
            assert current["vigente"]["origem"] == "usuario"
            assert [item["valor_centavos"] for item in current["historico"]] == [2550]

            # Lost response after the real commit: consult the same intent, never resend.
            statuses = []
            committed = asyncio.Event()
            loop = asyncio.get_running_loop()

            def lose_response(method, path, response):
                if method != "POST" or path != CHANGES:
                    return False
                statuses.append(response.status_code)
                loop.call_soon_threadsafe(committed.set)
                return len(statuses) == 1

            harness.frontend_proxy.after_api_response = lose_response
            dialog = await review(page, "40,00")
            await dialog.get_by_role(
                "button", name="Salvar unidade", exact=True
            ).click()
            await asyncio.wait_for(committed.wait(), timeout=30)
            await expect(
                card.get_by_text(
                    "Não foi possível confirmar se a nova unidade foi salva",
                    exact=False,
                )
            ).to_be_visible()
            await expect(
                page.get_by_label("Nova unidade (R$)", exact=True)
            ).to_be_disabled()
            assert statuses == [201] and len(sends) == 2
            async with page.expect_response(
                lambda r: r.url.endswith(CHANGES + "/intencao") and r.status == 200
            ) as consulted:
                await card.get_by_role("button", name="Consultar resultado").click()
            assert (await consulted.value).request.method == "GET"
            await expect(card).to_contain_text("Unidade de " + money(4000) + " salva.")
            assert statuses == [201] and len(sends) == 2
            harness.frontend_proxy.after_api_response = None
            assert await unit_rows(engine_admin, uid) == [(2550, False), (4000, True)]

            # New bet shows the unit in force now and keeps the filters in the link.
            await page.goto(core.backend.FRONT + f"/aposta/nova?casa={seeded['house']}")
            hint = page.get_by_text("Unidade agora:", exact=False)
            await expect(hint).to_contain_text(money(4000))
            await expect(
                hint.get_by_role("link", name="Configurações")
            ).to_have_attribute("href", f"/configuracoes?casa={seeded['house']}")

            await page.goto(address)
            await expect(card).to_contain_text(money(4000))
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
                        / f"unidade-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )
            await page.set_viewport_size({"width": 320, "height": 844})
            await expect(card).to_be_visible()
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= window.innerWidth"
            ), "The unit card must reflow at 320 px without horizontal scroll"
            await page.set_viewport_size(viewport)

            # READ_ONLY keeps consulting and blocks the change.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await core.fresh_session(page)
            assert (await core.read(page, "/api/v1/billing/status"))[
                "access"
            ] == "READ_ONLY"
            await page.goto(address)
            await expect(card).to_contain_text(money(4000))
            await expect(card).to_contain_text("modo de leitura")
            await expect(
                page.get_by_label("Nova unidade (R$)", exact=True)
            ).to_be_disabled()
            await expect(
                page.get_by_role("button", name="Revisar nova unidade")
            ).to_be_disabled()
            assert len(sends) == 2

            # Isolation: the other owner keeps the default and sees no history.
            separate = await core.read(other, UNIT)
            assert separate["vigente"]["origem"] == "padrao"
            assert separate["historico"] == []
            async with engine_admin.connect() as conn:
                after = list(await conn.execute(text(BETS), {"uid": uid}))
            assert after == before
            assert await page.locator("select,input[type=date]").count() == 0
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída").click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert await page.get_by_text("Histórico de unidades").count() == 0
        except Exception:
            try:
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"unidade-{browser_name}-{viewport['width']}-failure.png"
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
