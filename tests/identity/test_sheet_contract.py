"""Public SPA + actual XLSX API and PostgreSQL, no response/session mocks."""

import importlib.util
import os
import secrets
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_sheet_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
backend = core.backend


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_sheet_preview_remap_confirm(
    harness, engine_admin, viewport, browser_name
):
    await harness.restart()
    trace = (
        Path(os.environ["CORE_TRACE_DIR"])
        / f"sheet-{browser_name}-{viewport['width']}.zip"
    )
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        session, _ = await backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        uid = session["usuario_id"]
        await core.grant(page, engine_admin, uid)
        # Source/account inputs only; no financial result is seeded.
        async with engine_admin.begin() as conn:
            house = await conn.scalar(
                text(
                    "INSERT INTO casas(nome,dominio) VALUES('Betano','betano.com') RETURNING id"
                )
            )
        holder = await core.write(
            page, "/api/v1/titulares", {"nome": "Planilha"}, expected=201
        )
        account = await core.write(
            page,
            f"/api/v1/titulares/{holder['id']}/contas",
            {"casa_id": house, "apelido": "Planilha"},
            expected=201,
        )
        async with engine_admin.begin() as conn:
            await conn.execute(
                text("SELECT set_config('app.current_user_id',:uid,true)"),
                {"uid": str(uid)},
            )
            await conn.execute(
                text(
                    "UPDATE contas_casa SET estado='EM_USO' WHERE usuario_id=:uid AND id=:id"
                ),
                {"uid": uid, "id": account["conta_casa_id"]},
            )
            await conn.execute(
                text(
                    "INSERT INTO usos_conta_casa(usuario_id,casa_id,conta_casa_id,vigente_de,origem) VALUES(:uid,:house,:id,'2026-01-01T00:00:00Z','EXPLICITA')"
                ),
                {"uid": uid, "house": house, "id": account["conta_casa_id"]},
            )
        file = (
            harness.root / "tests/fixtures/sheet_import/synthetic-import.xlsx"
        ).read_bytes()
        writes = []
        page.on(
            "request",
            lambda r: (
                writes.append(r.method)
                if "/api/v1/planilhas/" in r.url and r.method != "GET"
                else None
            ),
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await page.goto(
                backend.FRONT + "/enviar?entrada=planilha&casa=7&apagadas=1"
            )
            await page.get_by_label("Nome da nova fonte", exact=True).fill(
                "Fonte estável"
            )
            await page.get_by_role("button", name="Registrar nova fonte").click()
            await expect(page.get_by_label("Arquivo XLSX", exact=True)).to_be_visible()
            source = parse_qs(urlsplit(page.url).query)["fonte"][0]
            assert writes == ["PUT"]
            await page.get_by_label("Arquivo XLSX", exact=True).set_input_files(
                {
                    "name": "planilha.xlsx",
                    "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "buffer": file,
                }
            )
            await page.get_by_role(
                "button", name="Conferir planilha", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "heading", name="Prévia pronta para conferir", exact=True
                )
            ).to_be_visible()
            original = parse_qs(urlsplit(page.url).query)["previa"][0]
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM apostas WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 0
                )
            # Swap a mapped column using the actual picker; a new preview is required.
            await page.get_by_text("Conferir ou corrigir colunas", exact=True).click()
            await page.get_by_role("button", name="Odd", exact=False).click()
            await page.get_by_role(
                "button", name="Coluna 5 · stake_unidades", exact=True
            ).click()
            await expect(
                page.get_by_role("button", name="Confirmar importação")
            ).to_be_disabled()
            await page.get_by_role("button", name="Gerar nova prévia").click()
            await expect(
                page.get_by_role(
                    "heading", name="Confira as linhas com erro", exact=True
                )
            ).to_be_visible()
            await page.get_by_text("Conferir ou corrigir colunas", exact=True).click()
            await page.get_by_role("button", name="Odd", exact=False).click()
            await page.get_by_role("button", name="Coluna 4 · odd", exact=True).click()
            await page.get_by_role("button", name="Gerar nova prévia").click()
            await expect(
                page.get_by_role("button", name="Confirmar importação")
            ).to_be_enabled()
            current = parse_qs(urlsplit(page.url).query)
            assert current["previa"][0] != original and current["fonte"] == [source]
            await page.get_by_role("button", name="Confirmar importação").focus()
            await page.keyboard.press("Enter")
            await expect(
                page.get_by_role("heading", name="Importação concluída", exact=True)
            ).to_be_visible()
            count = len(writes)
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM apostas WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 1
                )
            await core.accessibility(page)
            await page.reload()
            await expect(
                page.get_by_role("heading", name="Importação concluída", exact=True)
            ).to_be_visible()
            assert len(writes) == count
            await page.get_by_role(
                "button", name="Conferir outro arquivo da mesma fonte"
            ).click()
            await page.get_by_label("Arquivo XLSX", exact=True).set_input_files(
                {"name": "renomeada.xlsx", "buffer": file}
            )
            await page.get_by_role(
                "button", name="Conferir planilha", exact=True
            ).click()
            await expect(
                page.get_by_role("button", name="Confirmar importação")
            ).to_be_enabled()
            await page.get_by_role("button", name="Confirmar importação").click()
            await expect(
                page.get_by_role("heading", name="Importação concluída", exact=True)
            ).to_be_visible()
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM apostas WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 1
                )
            assert parse_qs(urlsplit(page.url).query)["fonte"] == [source]
            await page.set_viewport_size({"width": 320, "height": 844})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            )
        finally:
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await browser.close()
