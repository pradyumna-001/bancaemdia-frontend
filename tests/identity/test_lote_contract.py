"""Delete all bets as a reversible batch through the real public SPA and API (#124)."""

import asyncio
import importlib.util
import os
import re
import secrets
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_batch_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
BATCHES = "/api/v1/apostas/lotes"
BETS = (
    "SELECT chave,selecionada,stake_centavos,valor_aposta_centavos,retorno_centavos,"
    "conta_casa_id FROM apostas WHERE usuario_id=:uid AND chave IS NOT NULL ORDER BY chave"
)
CASH = "SELECT count(*), COALESCE(sum(valor_centavos),0) FROM movimentos WHERE usuario_id=:uid"


async def settled(page):
    # Cards load independently and grow when their data arrives; a click
    # computed before that can land on a target that has already moved.
    await expect(page.get_by_text(re.compile(r"^Consultando"))).to_have_count(0)


async def rows(engine, sql, uid):
    async with engine.connect() as conn:
        return list(await conn.execute(text(sql), {"uid": uid}))


def query(page):
    return parse_qs(urlsplit(page.url).query)


async def prepare(page, card):
    await card.get_by_role("button", name="Preparar exclusão", exact=True).click()
    phrase = card.get_by_label("Para confirmar, digite", exact=False)
    await expect(phrase).to_have_value("")
    return phrase


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_lote(harness, engine_admin, viewport, browser_name):
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
        other_user, _ = await core.backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        await core.grant(other, engine_admin, other_user["usuario_id"], seconds=240)
        # The house is global and already seeded: the other owner only needs
        # active bets of their own to prove isolation.
        for index in range(2):
            await core.write(
                other,
                "/api/v1/apostas",
                {
                    "casa": "Betano",
                    "odd": 2,
                    "stake_unidades": 1,
                    "evento": f"Outro dono {index}",
                    "data_aposta": "2026-10-10T12:00:00Z",
                },
                expected=201,
            )
        before = await rows(engine_admin, BETS, uid)
        other_before = await rows(engine_admin, BETS, other_user["usuario_id"])
        assert sum(row.selecionada for row in other_before) == 2
        cash_before = await rows(engine_admin, CASH, uid)
        active = [row.chave for row in before if row.selecionada]
        assert len(active) >= 2, "The seed must leave active bets to delete"
        everything = (
            await core.read(page, "/api/v1/apostas?page_size=100&visibilidade=todas")
        )["pagination"]["total"]
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"lote-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            address = core.backend.FRONT + f"/configuracoes?casa={seeded['house']}"
            await page.goto(address)
            await settled(page)
            card = page.get_by_role("region", name="Apagar todas as apostas")
            await expect(card).to_contain_text("não exporta seus dados")
            phrase = await prepare(page, card)
            preview = await core.read(page, BATCHES + "/previa-apagar")
            assert preview["total"] == len(active)
            await expect(card).to_contain_text(preview["frase"])
            delete = card.get_by_role(
                "button", name=f"Apagar {len(active)} apostas", exact=True
            )
            await expect(delete).to_be_disabled()

            # Lost answer after the real commit: consult the same key, never resend.
            sends, statuses = [], []
            committed = asyncio.Event()
            loop = asyncio.get_running_loop()

            def observe(request):
                if request.method == "POST" and BATCHES in request.url:
                    sends.append(dict(query(page)))

            def lose_response(method, path, response):
                if method != "POST" or path != BATCHES:
                    return False
                statuses.append(response.status_code)
                loop.call_soon_threadsafe(committed.set)
                return len(statuses) == 1

            page.on("request", observe)
            harness.frontend_proxy.after_api_response = lose_response
            await phrase.fill(preview["frase"].lower())
            await expect(delete).to_be_enabled()
            await delete.click()
            await asyncio.wait_for(committed.wait(), timeout=30)
            await expect(
                card.get_by_text("Não foi possível confirmar", exact=False)
            ).to_be_visible()
            assert statuses == [201] and len(sends) == 1
            key = query(page)["lote_apagar"][0]
            # The key was in the URL when the POST left.
            assert sends[0]["lote_apagar"] == [key]
            harness.frontend_proxy.after_api_response = None
            # Reload keeps only the key: consultation is still possible.
            await page.reload()
            await settled(page)
            async with page.expect_response(
                lambda r: r.url.endswith(BATCHES + "/intencao") and r.status == 200
            ):
                await card.get_by_role("button", name="Consultar resultado").click()
            await expect(card).to_contain_text(f"{len(active)} apostas apagadas em")
            assert len(sends) == 1
            batch = query(page)["lote"][0]
            assert "lote_apagar" not in query(page)
            assert query(page)["casa"] == [str(seeded["house"])]
            after_delete = await rows(engine_admin, BETS, uid)
            assert not any(row.selecionada for row in after_delete)
            assert [row.chave for row in after_delete] == [row.chave for row in before]
            listed = await core.read(page, "/api/v1/apostas?page_size=100")
            assert listed["pagination"]["total"] == 0
            hidden = await core.read(
                page, "/api/v1/apostas?page_size=100&visibilidade=todas"
            )
            assert hidden["pagination"]["total"] == everything
            await expect(
                card.get_by_role("link", name="Ver apostas, incluindo apagadas")
            ).to_have_attribute("href", f"/apostas?casa={seeded['house']}&apagadas=1")

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
                        / f"lote-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )
            await page.set_viewport_size({"width": 320, "height": 844})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= window.innerWidth"
            ), "The batch card must reflow at 320 px without horizontal scroll"
            await page.set_viewport_size(viewport)

            # Restore exactly this batch, once.
            async with page.expect_response(
                lambda r: (
                    r.url.endswith(f"{BATCHES}/{batch}/restaurar") and r.status == 200
                )
            ) as restored:
                await card.get_by_role(
                    "button", name="Restaurar apostas deste lote"
                ).click()
            receipt = await (await restored.value).json()
            assert receipt["apostas_restauradas"] == len(active)
            assert (await restored.value).request.headers.get("idempotency-key")
            await expect(card).to_contain_text("Lote restaurado em")
            await expect(
                card.get_by_role("button", name="Restaurar apostas deste lote")
            ).to_have_count(0)
            assert await rows(engine_admin, BETS, uid) == before
            assert len(sends) == 2

            # Isolation and scope: other owner and cash untouched. Entering
            # through the SPA renews the other owner's idle session.
            await other.goto(core.backend.FRONT + "/configuracoes")
            await settled(other)
            await expect(
                other.get_by_role("region", name="Apagar todas as apostas")
            ).to_be_visible()
            assert (
                await rows(engine_admin, BETS, other_user["usuario_id"]) == other_before
            )
            assert (await core.request(other, f"{BATCHES}/{batch}"))["status"] == 404
            assert await rows(engine_admin, CASH, uid) == cash_before

            # READ_ONLY consults the batch and the preview but cannot write.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await core.fresh_session(page)
            assert (await core.read(page, "/api/v1/billing/status"))[
                "access"
            ] == "READ_ONLY"
            await page.goto(address + f"&lote={batch}")
            await settled(page)
            await expect(card).to_contain_text("Lote restaurado em")
            phrase = await prepare(page, card)
            await phrase.fill(preview["frase"])
            await expect(
                card.get_by_role(
                    "button", name=f"Apagar {len(active)} apostas", exact=True
                )
            ).to_be_disabled()
            await expect(card).to_contain_text("não apagadas")
            assert len(sends) == 2
            assert await rows(engine_admin, BETS, uid) == before
            assert await page.locator("select,input[type=date]").count() == 0
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída").click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert await page.get_by_text("Lote de exclusão").count() == 0
        except Exception:
            try:
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"lote-{browser_name}-{viewport['width']}-failure.png"
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
