"""Banca cadastro inside Caixa through the real public SPA and API (#122)."""

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
    "frontend_bancas_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
BANCAS = "/api/v1/bancas"
ROWS = (
    "SELECT nome,saldo_inicial_centavos,arquivada_em IS NOT NULL AS arquivada "
    "FROM bancas WHERE usuario_id=:uid ORDER BY id"
)


async def settled(page):
    # Cards load independently and grow when their data arrives; a click
    # computed before that can land on a target that has already moved.
    await expect(page.get_by_text(re.compile(r"^Consultando"))).to_have_count(0)


async def rows(engine, uid):
    async with engine.connect() as conn:
        return [tuple(row) for row in await conn.execute(text(ROWS), {"uid": uid})]


async def create(page, section, name, capital=""):
    await section.get_by_role("button", name="Nova banca", exact=True).click()
    await section.get_by_label("Nome da banca", exact=True).fill(name)
    if capital:
        await section.get_by_label("Capital inicial (R$)", exact=True).fill(capital)
    async with page.expect_response(
        lambda r: (
            r.request.method == "POST" and r.url.endswith(BANCAS) and r.status == 201
        )
    ) as created:
        await section.get_by_role("button", name="Criar banca", exact=True).click()
    response = await created.value
    assert response.request.headers.get("idempotency-key")
    await expect(section).to_contain_text(f"Banca {name} criada.")
    return await response.json()


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_bancas(harness, engine_admin, viewport, browser_name):
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
        assert (await core.read(page, BANCAS))["bancas"] == []
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"bancas-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            address = core.backend.FRONT + f"/banca?casa={seeded['house']}"
            await page.goto(address)
            await settled(page)
            section = page.get_by_role("region", name="Bancas")
            await expect(section).to_contain_text("Nenhuma banca ativa")
            first = await create(page, section, "Banca real", "1500,50")
            assert first["saldo_inicial_centavos"] == 150050
            await expect(
                section.get_by_role("article", name="Banca real")
            ).to_contain_text("R$ 1.500,50")
            assert await rows(engine_admin, uid) == [("Banca real", 150050, False)]

            # Lost answer after the real commit: reload, consult, never resend.
            sends, statuses = [], []
            committed = asyncio.Event()
            loop = asyncio.get_running_loop()

            def observe(request):
                if request.method in {"POST", "PATCH"} and BANCAS in request.url:
                    sends.append(request.method)

            def lose_response(method, path, response):
                if method != "PATCH" or not path.startswith(BANCAS + "/"):
                    return False
                statuses.append(response.status_code)
                loop.call_soon_threadsafe(committed.set)
                return len(statuses) == 1

            page.on("request", observe)
            harness.frontend_proxy.after_api_response = lose_response
            await section.get_by_role("button", name="Editar Banca real").click()
            await section.get_by_label("Nome da banca", exact=True).fill(
                "Banca real revisada"
            )
            await section.get_by_role("button", name="Salvar alterações").click()
            await asyncio.wait_for(committed.wait(), timeout=30)
            await expect(
                section.get_by_text("Não foi possível confirmar", exact=False)
            ).to_be_visible()
            assert statuses == [200] and sends == ["PATCH"]
            key = parse_qs(urlsplit(page.url).query)["banca_intencao"][0]
            harness.frontend_proxy.after_api_response = None
            await page.reload()
            await settled(page)
            assert parse_qs(urlsplit(page.url).query)["banca_intencao"] == [key]
            async with page.expect_response(
                lambda r: r.url.endswith(BANCAS + "/intencao") and r.status == 200
            ):
                await section.get_by_role("button", name="Consultar resultado").click()
            await expect(section).to_contain_text(
                "Alterações da banca Banca real revisada salvas."
            )
            assert sends == ["PATCH"]
            assert "banca_intencao" not in parse_qs(urlsplit(page.url).query)
            assert await rows(engine_admin, uid) == [
                ("Banca real revisada", 150050, False)
            ]

            # A linked account blocks archiving; an empty banca archives.
            linked = await core.write(
                page,
                f"/api/v1/caixa/contas/{seeded['accounts'][0]}/banca",
                {"banca_id": first["id"]},
                method="PATCH",
            )
            assert linked["banca_id"] == first["id"]
            await page.goto(address)
            await settled(page)
            card = section.get_by_role("article", name="Banca real revisada")
            await expect(
                card.get_by_role("button", name="Arquivar Banca real revisada")
            ).to_be_disabled()
            spare = await create(page, section, "Banca vazia")
            assert spare["saldo_inicial_centavos"] is None
            await expect(
                section.get_by_role("article", name="Banca vazia")
            ).to_contain_text("Não informado")
            archive = section.get_by_role("button", name="Arquivar Banca vazia")
            await archive.click()
            dialog = page.get_by_role("dialog", name="Arquivar esta banca?")
            await expect(dialog.get_by_role("button", name="Agora não")).to_be_focused()
            await page.keyboard.press("Escape")
            await expect(archive).to_be_focused()
            await archive.click()
            await dialog.get_by_role("button", name="Arquivar banca").click()
            await expect(section).to_contain_text("Bancas arquivadas (1)")
            assert await rows(engine_admin, uid) == [
                ("Banca real revisada", 150050, False),
                ("Banca vazia", None, True),
            ]
            refused = await core.request(
                page,
                f"/api/v1/caixa/contas/{seeded['accounts'][1]}/banca",
                method="PATCH",
                csrf=(await core.request(page, "/auth/session"))["data"]["csrf_token"],
                body={"banca_id": spare["id"]},
            )
            assert refused["status"] == 409

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
                        / f"bancas-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )
            await page.set_viewport_size({"width": 320, "height": 844})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= window.innerWidth"
            ), "The bancas section must reflow at 320 px without horizontal scroll"
            await page.set_viewport_size(viewport)

            # Isolation: the other owner sees no banca. Entering through the
            # SPA renews that idle session.
            await other.goto(core.backend.FRONT + "/banca")
            await settled(other)
            await expect(other.get_by_role("region", name="Bancas")).to_contain_text(
                "Nenhuma banca ativa"
            )
            assert (await core.read(other, BANCAS))["bancas"] == []

            # READ_ONLY keeps reading and blocks every write control.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await core.fresh_session(page)
            assert (await core.read(page, "/api/v1/billing/status"))[
                "access"
            ] == "READ_ONLY"
            await page.goto(address)
            await settled(page)
            await expect(
                section.get_by_role("article", name="Banca real revisada")
            ).to_contain_text("R$ 1.500,50")
            await expect(
                section.get_by_role("button", name="Nova banca")
            ).to_be_disabled()
            await expect(section).to_contain_text("podem ser consultadas")
            assert sends.count("PATCH") == 1
            assert await page.locator("select,input[type=date]").count() == 0
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída").click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert await page.get_by_text("Banca real revisada").count() == 0
        except Exception:
            try:
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"bancas-{browser_name}-{viewport['width']}-failure.png"
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
