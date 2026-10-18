"""Real intake/matching viewed through the public SPA, never mocked responses."""

import importlib.util
import os
import secrets
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tests.integration.cruzamento import test_consolidacao as matching

_spec = importlib.util.spec_from_file_location(
    "frontend_product_matching_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
@pytest.mark.parametrize("order", ["house-first", "telegram-first"])
async def test_public_spa_matching(
    harness, engine_admin, engine_app, viewport, browser_name, order
):
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"produto-{order}-{browser_name}-{viewport['width']}.zip"
        )
        tracing = False
        try:
            session, _ = await core.backend.register(
                page,
                uuid4().hex + "@example.org",
                secrets.token_urlsafe(24),
                harness=harness,
            )
            uid = session["usuario_id"]
            await core.grant(page, engine_admin, uid)
            house, accounts = await matching.accounts(engine_admin, engine_app, uid)
            ticket = "synthetic-" + uuid4().hex
            raw = matching.house_payload(ticket)
            tip = matching.telegram_payload(ticket)
            if order == "house-first":
                house_bet = await matching.intake_house(engine_app, uid, house, raw)
                tip_bet = await matching.intake_telegram(engine_app, uid, tip)
            else:
                tip_bet = await matching.intake_telegram(engine_app, uid, tip)
                house_bet = await matching.intake_house(engine_app, uid, house, raw)
            totals, links = await matching.financial(engine_app, uid)
            assert totals == {
                "count": 1,
                "stake": 10000,
                "return": 0,
                "exposure": 10000,
            }
            assert len(links) == 1 and links[0].estado == "active"
            assert links[0].casa_aposta_id == house_bet
            assert links[0].telegram_aposta_id == tip_bet
            assert links[0].conta_casa_id == accounts[0]
            # Source envelopes are synthetic inputs to the real intake/workers.
            # They do not certify a released extension or real bookmaker reader.
            await matching.intake_house(
                engine_app, uid, house, matching.house_payload(ticket, state="Win")
            )
            await matching.intake_telegram(engine_app, uid, tip)
            settled, repeated = await matching.financial(engine_app, uid)
            assert settled == {
                "count": 1,
                "stake": 10000,
                "return": 20000,
                "exposure": 0,
            }
            assert repeated[0].id == links[0].id
            await context.tracing.start(
                screenshots=False, snapshots=False, sources=False
            )
            tracing = True
            query = {
                "casa_id": str(house),
                "conta_casa_id": str(accounts[0]),
                "periodo": "all",
            }
            listed, daily = await core.assert_population(page, query, 1)
            assert daily["total_periodo"]["lucro_centavos"] == "10000"
            key = listed["data"][0]["chave"]
            async with AsyncSession(engine_app) as db:
                await matching.owner(db, uid)
                rows = list(
                    await db.scalars(
                        select(matching.models.Aposta).where(
                            matching.models.Aposta.usuario_id == uid
                        )
                    )
                )
                assert len(rows) == 2 and all(row.selecionada for row in rows)
            await page.goto(
                core.backend.FRONT
                + f"/apostas?casa={house}&conta={accounts[0]}&periodo=all"
            )
            await expect(
                page.get_by_role("heading", name="Apostas", exact=True)
            ).to_be_visible()
            await expect(page.locator(".aposta-linha")).to_have_count(1)
            await page.get_by_role("link", name="Azul - Verde", exact=True).click()
            detail = await core.read(page, "/api/v1/apostas/" + key)
            assert detail["aposta"]["conta_casa_id"] == accounts[0]
            assert len(detail["consolidacoes"]) == 1
            for theme in ("claro", "escuro"):
                await page.evaluate(
                    "t => document.documentElement.dataset.tema=t", theme
                )
                await core.accessibility(page)
            assert await page.locator("select,input[type=date]").count() == 0
        finally:
            if tracing:
                await context.tracing.stop(path=str(trace))
                core.sanitize_trace(trace)
            await context.close()
            await browser.close()
