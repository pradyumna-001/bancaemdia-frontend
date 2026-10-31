"""Review decisions on the public SPA and one real API/PostgreSQL tree.

Synthetic source inputs only; views, CAS decisions, receipts and balances are real.
"""

import hashlib
import importlib.util
import os
import re
import secrets
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_review_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
backend = core.backend
P = "/api/v1/revisao-operacional"


async def choose(page, label, option):
    await page.get_by_role("button", name=re.compile("^" + re.escape(label))).click()
    await page.get_by_role("button", name=option, exact=True).click()


async def open_review(page, rid):
    await page.goto(backend.FRONT + f"/revisao?revisao_item={rid}")
    await expect(page.get_by_text(f"· revisão {rid}", exact=False)).to_be_visible()
    await expect(page.get_by_text("Conferindo evidência atual…")).to_have_count(0)


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_revisao_typed_decisions_recovery(
    harness, engine_admin, engine_app, como, viewport, browser_name
):
    from bancaemdia.models.web_print import PrintAsset
    from bancaemdia.repositories.mensagem_repo import MidiaArquivoRepo, MidiaRepo
    from bancaemdia.workers.web_print import materialize
    from tests.integration.test_aposta_foto_db import image_bytes
    from tests.integration.test_results_db import seed
    from tests.integration.test_reviews_db import ordinary, review, server_pair
    from tests.integration.test_web_print_db import reading

    await harness.restart()
    trace = (
        Path(os.environ["CORE_TRACE_DIR"])
        / f"revisao-{browser_name}-{viewport['width']}.zip"
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
        await core.grant(page, engine_admin, uid, seconds=600)
        pair_id, _, _, account = await server_pair(engine_app, engine_admin, como, uid)
        _, reading_id = await ordinary(engine_app, como, uid, account)
        _, discard_id = await ordinary(
            engine_app, como, uid, account, evento="Descartar leitura"
        )
        account_key = await seed(engine_app, como, uid, None)
        account_id = await review(
            engine_app, como, uid, account_key, raw={"tipo_revisao": "conta"}
        )
        content = image_bytes()
        digest = hashlib.sha256(content).hexdigest()
        async with como(engine_app, uid) as db:
            await MidiaRepo().upsert_idempotent(db, digest, "image/png", len(content))
            await MidiaArquivoRepo().upsert_idempotent(db, digest, content)
            await db.execute(
                text(
                    "UPDATE revisao_pendente SET midia_hash=:h WHERE usuario_id=:u AND id=:i"
                ),
                {"h": digest, "u": uid, "i": reading_id},
            )
            asset = PrintAsset(
                usuario_id=uid,
                digest=digest,
                mime="image/png",
                size=len(content),
                media_expires_at=datetime.now(UTC) + timedelta(days=1),
                status="completed",
            )
            db.add(asset)
            await db.flush()
            asset.results = await materialize(db, uid, asset, reading(stake=None))
            print_id = asset.results[0]["review_ids"][0]
            await db.commit()
        writes = []
        disconnect_next = False

        async def observe(route):
            nonlocal disconnect_next
            request = route.request
            if request.method == "POST":
                writes.append(request)
                reference = request.url.rsplit("/", 1)[-1]
                assert "revisao_operacao=" + reference in page.url
                if disconnect_next:
                    disconnect_next = False
                    response = await route.fetch()
                    assert response.status == 200
                    await route.abort("failed")
                    return
            await route.continue_()

        await page.route("**/api/v1/revisao-operacional/**", observe)
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await open_review(page, reading_id)
            await page.get_by_text("Conferir foto original", exact=True).click()
            await page.get_by_role("button", name="Abrir foto", exact=True).click()
            await expect(
                page.get_by_role(
                    "img", name="Foto original vinculada a esta aposta", exact=True
                )
            ).to_be_visible()
            await page.get_by_role("button", name="Ampliar foto", exact=True).click()
            await page.keyboard.press("Escape")
            await expect(
                page.get_by_role("button", name="Ampliar foto", exact=True)
            ).to_be_focused()
            await page.get_by_label("Odd", exact=True).fill("2,5")
            disconnect_next = True
            await page.get_by_role("button", name="Salvar correção", exact=True).click()
            await expect(
                page.get_by_role("button", name="Consultar decisão", exact=True)
            ).to_be_enabled()
            assert len(writes) == 1
            await page.get_by_role(
                "button", name="Consultar decisão", exact=True
            ).click()
            await expect(
                page.get_by_text(
                    "Revisão resolvida. A fila foi consultada novamente desde o início.",
                    exact=True,
                )
            ).to_be_visible()
            assert len(writes) == 1
            await open_review(page, account_id)
            assert (
                await page.get_by_text("Conferir foto original", exact=True).count()
                == 0
            )
            await page.get_by_role("button", name="Confirmar conta", exact=True).click()
            await expect(
                page.get_by_text(
                    "Escolha uma conta válida para esta aposta.", exact=True
                )
            ).to_be_visible()
            current = (await core.request(page, P + f"/revisoes/{account_id}"))["data"]
            candidate = current["conta"]["candidatos"][0]
            await choose(
                page,
                "Conta para esta aposta ",
                re.compile("^" + re.escape(candidate["apelido"] + " · ")),
            )
            await page.get_by_role("button", name="Confirmar conta", exact=True).click()
            await expect(
                page.get_by_text(
                    "Revisão resolvida. A fila foi consultada novamente desde o início.",
                    exact=True,
                )
            ).to_be_visible()
            assert writes[-1].post_data_json["conta_casa_id"] == candidate["id"]
            await open_review(page, pair_id)
            await page.get_by_role(
                "button", name="São a mesma aposta", exact=True
            ).click()
            await expect(
                page.get_by_text(
                    "Escolha o tipster que deve ficar na aposta.", exact=True
                )
            ).to_be_visible()
            await choose(
                page,
                "Tipster da aposta vinculada ",
                re.compile("Telegram.*Tipster Telegram"),
            )
            await page.get_by_role(
                "button", name="São a mesma aposta", exact=True
            ).click()
            await page.get_by_role(
                "button", name="Confirmar decisão", exact=True
            ).click()
            await expect(
                page.get_by_text(
                    "Revisão resolvida. A fila foi consultada novamente desde o início.",
                    exact=True,
                )
            ).to_be_visible()
            assert writes[-1].post_data_json["tipster_choice"] == "telegram"
            await open_review(page, print_id)
            await expect(
                page.get_by_label("Valor em unidades", exact=True)
            ).to_have_value("")
            await page.get_by_label("Valor em unidades", exact=True).fill("1")
            await page.get_by_role("button", name="Salvar correção", exact=True).click()
            await expect(
                page.get_by_text(
                    "Revisão resolvida. A fila foi consultada novamente desde o início.",
                    exact=True,
                )
            ).to_be_visible()
            await open_review(page, discard_id)
            await page.get_by_role(
                "button", name="Descartar revisão", exact=True
            ).click()
            await page.get_by_role(
                "button", name="Confirmar decisão", exact=True
            ).click()
            await expect(
                page.get_by_text(
                    "Revisão resolvida. A fila foi consultada novamente desde o início.",
                    exact=True,
                )
            ).to_be_visible()
            await expect(
                page.get_by_role(
                    "heading", name="Tudo conferido neste recorte", exact=True
                )
            ).to_be_visible()
            assert len(writes) == 5
            # Revoke session at the issuer-backed API; private evidence must disappear.
            await core.write(page, "/auth/logout", method="POST")
            await page.goto(backend.FRONT + "/revisao")
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert (await core.request(page, P + f"/revisoes/{reading_id}"))[
                "status"
            ] == 401
        finally:
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await browser.close()
