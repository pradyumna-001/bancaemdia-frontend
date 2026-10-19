"""Cash gestures on the public SPA with actual issuer/API/PostgreSQL."""

import asyncio
import importlib.util
import os
import re
import secrets
import sys
import time
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_cash_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
backend = core.backend


async def choose(page, label, option):
    await page.get_by_role("button", name=re.compile("^" + re.escape(label))).click()
    await page.get_by_role("button", name=option, exact=True).click()


async def movement(page, kind, source, destination=None, amount="100,00"):
    await choose(page, "Movimento ", kind)
    await choose(
        page, "Conta de origem " if destination else "Conta do lançamento ", source
    )
    if destination:
        await choose(page, "Conta de destino ", destination)
    await page.get_by_label("Valor (R$)", exact=True).fill(amount)
    await page.get_by_label("Data e hora com fuso").fill("13/10/2026 14:30-03:00")
    await page.get_by_role("button", name="Conferir lançamento", exact=True).click()
    await (
        page.get_by_role("dialog", name="Confirmar lançamento?")
        .get_by_role("button", name="Confirmar", exact=True)
        .click()
    )


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_caixa_atomic_money_recovery(
    harness, engine_admin, viewport, browser_name
):
    await harness.restart()
    trace = (
        Path(os.environ["CORE_TRACE_DIR"])
        / f"caixa-{browser_name}-{viewport['width']}.zip"
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
        expiry = await core.grant(page, engine_admin, uid, seconds=120)
        async with engine_admin.begin() as conn:
            house = await conn.scalar(
                text(
                    "INSERT INTO casas(nome,dominio) VALUES('Betano','betano.com') RETURNING id"
                )
            )
            bank = await conn.scalar(
                text(
                    "INSERT INTO bancas(usuario_id,nome,saldo_inicial_centavos) VALUES(:uid,'Banca real',50000) RETURNING id"
                ),
                {"uid": uid},
            )
        accounts = []
        for name in ("Origem", "Destino"):
            holder = await core.write(
                page, "/api/v1/titulares", {"nome": "Caixa real " + name}, expected=201
            )
            account = await core.write(
                page,
                f"/api/v1/titulares/{holder['id']}/contas",
                {"casa_id": house, "apelido": name},
                expected=201,
            )
            accounts.append(account["conta_casa_id"])
        writes = []
        disconnect_next = False

        async def observe_cash(route):
            nonlocal disconnect_next
            request = route.request
            if request.method != "GET":
                writes.append(request)
            if (
                disconnect_next
                and request.method == "POST"
                and request.url.endswith("/api/v1/caixa")
            ):
                disconnect_next = False
                response = await route.fetch()
                assert response.status == 201
                await route.abort("failed")
            else:
                await route.continue_()

        await page.route("**/api/v1/caixa**", observe_cash)
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await page.goto(backend.FRONT + "/banca?casa=" + str(house))
            source, destination = (
                "Caixa real Origem · Betano · Origem",
                "Caixa real Destino · Betano · Destino",
            )
            await expect(
                page.get_by_role("heading", name=source, exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_text("Saldo desconhecido", exact=True)
            ).to_have_count(3)
            await movement(page, "Depósito", source)
            await expect(
                page.get_by_text("Depósito registrado.", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Conferir lançamento", exact=True)
            ).to_be_enabled()
            await movement(page, "Transferência", source, destination, "25,00")
            await expect(
                page.get_by_text("Transferência registrada.", exact=True)
            ).to_be_visible()
            assert len(writes) == 2
            saldo = (await core.request(page, "/api/v1/caixa/saldo"))["data"]
            received = {
                c["conta_casa_id"]: c["saldo_atual_centavos"] for c in saldo["contas"]
            }
            assert received[accounts[0]] == 7500 and received[accounts[1]] == 2500
            source_card = page.get_by_role("article").filter(
                has=page.get_by_role("heading", name=source, exact=True)
            )
            destination_card = page.get_by_role("article").filter(
                has=page.get_by_role("heading", name=destination, exact=True)
            )
            await expect(
                source_card.locator("dl").first.get_by_text("R$ 75,00", exact=True)
            ).to_be_visible()
            await expect(
                destination_card.locator("dl").first.get_by_text("R$ 25,00", exact=True)
            ).to_be_visible()
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM movimentos WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 3
                )

            # A genuine committed response is lost. Only explicit GET then identical key/body replay.
            disconnect_next = True
            await movement(page, "Depósito", source, amount="10,00")
            await expect(
                page.get_by_role("heading", name="Conferir o lançamento", exact=True)
            ).to_be_visible()
            assert len(writes) == 3
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM movimentos WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 4
                )
            original = writes[-1]
            await page.get_by_role(
                "button", name="Conferir movimentos e vínculo", exact=True
            ).click()
            replay = page.get_by_role(
                "button", name="Reenviar este lançamento", exact=True
            )
            await expect(replay).to_be_enabled()
            assert len(writes) == 3
            await replay.click()
            await expect(
                page.get_by_text("Depósito registrado.", exact=True)
            ).to_be_visible()
            assert len(writes) == 4
            assert (
                writes[-1].headers["idempotency-key"]
                == original.headers["idempotency-key"]
            )
            assert writes[-1].post_data_json == original.post_data_json
            await expect(
                source_card.locator("dl").first.get_by_text("R$ 85,00", exact=True)
            ).to_be_visible()
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM movimentos WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 4
                )
            await expect(
                page.get_by_role(
                    "button", name=f"Banca da conta {accounts[0]}", exact=False
                )
            ).to_be_enabled()
            await choose(page, f"Banca da conta {accounts[0]} ", "Banca real")
            article = page.get_by_role("article").filter(
                has=page.get_by_role("heading", name=source, exact=True)
            )
            await article.get_by_role(
                "button", name="Salvar vínculo", exact=True
            ).click()
            await (
                page.get_by_role("dialog", name="Confirmar vínculo da conta?")
                .get_by_role("button", name="Confirmar", exact=True)
                .click()
            )
            await expect(
                page.get_by_text("Vínculo da conta com a banca atualizado.", exact=True)
            ).to_be_visible()
            saldo = (await core.request(page, "/api/v1/caixa/saldo"))["data"]
            assert (
                next(c for c in saldo["contas"] if c["conta_casa_id"] == accounts[0])[
                    "banca_id"
                ]
                == bank
            )
            await page.get_by_role("link", name="Movimentos", exact=True).click()
            await expect(
                page.get_by_text("Página 1 · 4 itens neste recorte", exact=True)
            ).to_be_visible()
            assert "casa=" + str(house) in page.url
            # Another real identity cannot see or change the owner's account.
            other = await browser.new_context(viewport=viewport)
            other_page = await other.new_page()
            other_session, _ = await backend.register(
                other_page,
                uuid4().hex + "@example.org",
                secrets.token_urlsafe(24),
                harness=harness,
            )
            await core.grant(other_page, engine_admin, other_session["usuario_id"])
            assert (await core.request(other_page, "/api/v1/caixa/saldo"))["data"][
                "contas"
            ] == []
            assert (
                await core.request(
                    other_page,
                    f"/api/v1/caixa/contas/{accounts[0]}/banca",
                    method="PATCH",
                    csrf=other_session["csrf_token"],
                    body={"banca_id": bank},
                )
            )["status"] == 404
            await other.close()
            # The actual trial expires. The commercial revalidation refuses a new write.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            count = len(writes)
            await movement(page, "Saque", source, amount="1,00")
            await expect(
                page.get_by_text("Seu acesso permite consultar os dados.", exact=False)
            ).to_be_visible()
            assert len(writes) == count
            await expect(page.get_by_label("Valor (R$)", exact=True)).to_have_value(
                "1,00"
            )
            assert (await core.request(page, "/auth/session"))["status"] == 200
            await page.set_viewport_size({"width": 320, "height": 844})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            )
            # Keep the original document alive while a second tab acquires the
            # session Web Lock. Logout must clear the original private page too.
            logout_page = await context.new_page()
            await core.open_read_only_logout(logout_page, "/sair?destino=%2Fbanca")
            await expect(
                logout_page.get_by_role("button", name="Confirmar saída", exact=True)
            ).to_be_enabled()
            async with logout_page.expect_response(
                lambda response: (
                    response.url.endswith("/auth/logout")
                    and response.request.method == "POST"
                )
            ) as pending_logout:
                await logout_page.get_by_role(
                    "button", name="Confirmar saída", exact=True
                ).click()
            logout = await pending_logout.value
            assert logout.status == 200 and await logout.json() == {"logged_out": True}
            await expect(
                logout_page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert (await core.request(page, "/auth/session"))["status"] == 401
            await page.goto(backend.FRONT + "/banca")
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert (
                await page.get_by_role("heading", name=source, exact=True).count() == 0
            )
        finally:
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await browser.close()
