"""Previously reviewed historical comparison, now in the complete real matrix."""

import importlib.util
import secrets
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

_spec = importlib.util.spec_from_file_location(
    "frontend_product_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
backend = core.backend
browser_request = core.request


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_historical_comparison(
    harness, engine_admin, viewport, browser_name
):
    """Public SPA + candidate #191: confirmed stake, RLS, immutable money, READ_ONLY."""
    from bancaemdia import models

    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        other_context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        other = await other_context.new_page()
        session, _ = await backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        uid = session["usuario_id"]
        factory = async_sessionmaker(engine_admin, expire_on_commit=False)
        async with factory() as db:
            casa = models.Casa(nome="hipotetica-" + uuid4().hex)
            db.add(casa)
            await db.flush()
            conta = models.ContaCasa(
                usuario_id=uid, casa_id=casa.id, apelido="Descartável"
            )
            db.add(conta)
            await db.flush()
            house = models.Aposta(
                usuario_id=uid,
                chave="hip-house:" + uuid4().hex,
                origem="casa",
                estado="GREEN",
                odd=2,
                stake_unidades=1,
                stake_centavos=16000,
                valor_aposta_centavos=16000,
                retorno_centavos=32000,
                selecionada=True,
                revisao_grave=False,
                conta_casa_id=conta.id,
                data_aposta=datetime.fromisoformat("2026-10-10T03:00:00+00:00"),
            )
            dica = models.Aposta(
                usuario_id=uid,
                chave="hip-tip:" + uuid4().hex,
                origem="telegram",
                chat_id=123,
                message_id=1,
                estado="RED",
                odd=9,
                stake_unidades=1,
                stake_centavos=2000,
                valor_aposta_centavos=2000,
                retorno_centavos=0,
                selecionada=False,
                revisao_grave=False,
            )
            db.add_all([house, dica])
            await db.flush()
            db.add(
                models.ApostaConsolidacao(
                    usuario_id=uid,
                    casa_aposta_id=house.id,
                    telegram_aposta_id=dica.id,
                    conta_casa_id=conta.id,
                    estado="active",
                    decisao="reviewed",
                    versao="frontend-21-test",
                    evidencia={},
                    contexto={},
                    ator="test",
                )
            )
            db.add(
                models.Evento(
                    usuario_id=uid,
                    aposta_chave=house.chave,
                    tipo="APOSTA_CRIADA",
                    fonte="casa",
                    payload_json={
                        "origem": "casa",
                        "comissao_centavos": 0,
                        "stake_centavos": 16000,
                    },
                )
            )
            await db.commit()
            account_id = conta.id

        async def snapshot():
            async with factory() as db:
                return [
                    list(
                        (
                            await db.execute(
                                select(model.__table__).where(model.usuario_id == uid)
                            )
                        ).mappings()
                    )
                    for model in (
                        models.Aposta,
                        models.Evento,
                        models.ApostaConsolidacao,
                        models.Movimento,
                    )
                ]

        before = await snapshot()
        async with engine_admin.begin() as conn:
            await conn.execute(text("SELECT billing_activate_rollout()"))
        status = await browser_request(page, "/api/v1/billing/status")
        assert status["status"] == 200 and status["data"]["access"] == "READ_ONLY"
        query = f"?conta={account_id}&origem=casa&desde=2026-10-10&ate=2026-10-10"
        await page.goto(backend.FRONT + "/e-se" + query)
        await expect(
            page.get_by_role("heading", name="Comparação disponível")
        ).to_be_visible()
        await expect(
            page.get_by_role("region", name="O que aconteceu")
        ).to_contain_text("+R$ 160,00")
        await expect(
            page.get_by_role("region", name="Seguindo a stake do tipster")
        ).to_contain_text("+R$ 20,00")
        await expect(page.get_by_role("region", name="O que mudaria")).to_contain_text(
            "−R$ 140,00"
        )
        await expect(
            page.get_by_role("link", name="← Voltar às Apostas")
        ).to_have_attribute("href", "/" + query)
        async with page.expect_response(
            lambda r: "/painel/hipotetica?" in r.url
        ) as pending:
            await page.get_by_role("button", name="Atualizar comparação").click()
        result = await pending.value
        assert result.status == 200 and result.request.method == "GET"
        assert "authorization" not in result.request.headers
        assert "no-store" in result.headers["cache-control"]
        response = await result.json()
        assert response["apostas_consideradas"] == response["apostas_alteradas"] == 1
        assert response["hipotetico"]["lucro_centavos"] == "2000"
        assert response["filtros"]["conta_casa_id"] == str(account_id)
        assert before == await snapshot()
        await backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        foreign = await browser_request(
            other, f"/api/v1/painel/hipotetica?conta_casa_id={account_id}"
        )
        missing = await browser_request(
            other, "/api/v1/painel/hipotetica?conta_casa_id=9223372036854775807"
        )
        assert foreign["status"] == missing["status"] == 404
        assert foreign["data"] == missing["data"]
        await other.goto(backend.FRONT + "/e-se")
        await expect(
            other.get_by_role("heading", name="Nenhuma aposta neste recorte")
        ).to_be_visible()
        # The second owner's tab was active. Activate this tab before the fresh
        # navigation, so automatic session revalidation cannot consume the
        # first logout gesture while Playwright is focusing a background tab.
        await page.bring_to_front()
        await page.goto(backend.FRONT + "/sair")
        async with page.expect_response(
            lambda r: r.url.endswith("/auth/logout") and r.request.method == "POST"
        ) as pending_logout:
            await page.get_by_role("button", name="Confirmar saída", exact=True).click()
        logout = await pending_logout.value
        assert logout.status == 200 and await logout.json() == {"logged_out": True}
        await expect(
            page.get_by_role("heading", name="Entrar", exact=True)
        ).to_be_visible()
        assert (await browser_request(page, "/auth/session"))["status"] == 401
        await page.goto(backend.FRONT + "/e-se" + query)
        await expect(
            page.get_by_role("heading", name="Entrar", exact=True)
        ).to_be_visible()
        assert not await page.evaluate(
            "Boolean(document.cookie) || Object.keys(localStorage).length > 0"
        )
        await context.close()
        await other_context.close()
        await browser.close()
