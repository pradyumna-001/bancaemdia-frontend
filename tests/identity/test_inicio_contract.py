"""Optional first-use guide ends with an authoritative manual receipt, not a flag."""

import importlib.util
import json
import os
import re
import secrets
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_inicio_manual", Path(__file__).with_name("test_manual_contract.py")
)
manual = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = manual
_spec.loader.exec_module(manual)
core = manual.core
banco = core.banco
harness = core.harness


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_inicio(harness, engine_admin, viewport, browser_name):
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        # Before rollout the API intentionally grants FULL_WRITE, even when
        # the card is pending. This scenario exercises an enforced new signup.
        async with engine_admin.begin() as conn:
            await conn.execute(text("SELECT billing_activate_rollout()"))
        user, _ = await core.backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        initial_access = await core.request(page, "/api/v1/billing/status")
        assert initial_access["status"] == 200
        assert initial_access["data"]["access"] == "READ_ONLY"
        assert initial_access["data"]["status"] == "AWAITING_CARD"
        async with engine_admin.begin() as conn:
            house = await conn.scalar(
                text(
                    "INSERT INTO casas(nome,dominio) VALUES ('Betano','betano.com') RETURNING id"
                )
            )
        trace_dir = Path(os.environ["CORE_TRACE_DIR"])
        stem = f"inicio-{browser_name}-{viewport['width']}"
        trace = trace_dir / (stem + ".zip")
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        task = "acesso_pendente"
        started = time.monotonic()
        measurements = []

        def measured():
            measurements.append(
                {
                    "task": task,
                    "result": "success",
                    "duration_ms": round((time.monotonic() - started) * 1000),
                }
            )

        address = core.backend.FRONT + f"/inicio?casa={house}&apagadas=1"
        try:
            await page.goto(address)
            await expect(
                page.get_by_role(
                    "heading", name="Confira seu acesso para enviar apostas"
                )
            ).to_be_visible()
            await expect(
                page.get_by_text("Confirmação do cartão pendente", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_role("link", name="Abrir Nova aposta")
            ).to_have_count(0)
            await expect(
                page.get_by_role("link", name="Consultar exportação dos meus registros")
            ).to_be_visible()
            measured()
            task, started = "conta_ausente", time.monotonic()
            await core.grant(page, engine_admin, user["usuario_id"], seconds=600)
            await page.reload()
            await expect(
                page.get_by_role("heading", name="Prepare a conta da casa")
            ).to_be_visible()
            await expect(
                page.get_by_text("Período gratuito confirmado até", exact=False)
            ).to_be_visible()
            await page.get_by_text(
                "Entenda titular e conta da casa", exact=True
            ).click()
            await expect(
                page.get_by_text(
                    "Você ainda não cadastrou titulares. Ainda não há contas da casa cadastradas.",
                    exact=True,
                )
            ).to_be_visible()
            await page.get_by_role(
                "link", name="Organizar contas e titulares", exact=True
            ).first.click()
            await expect(
                page.get_by_role("heading", name="Contas e titulares", exact=True)
            ).to_be_visible()
            await page.get_by_text("Cadastrar titular", exact=True).first.click()
            await page.get_by_label("Nome do titular", exact=True).fill(
                "Titular de primeiro uso"
            )
            await page.get_by_role(
                "button", name="Cadastrar titular", exact=True
            ).click()
            await page.get_by_role(
                "link", name="Titular de primeiro uso", exact=True
            ).click()
            await page.get_by_text("Cadastrar conta", exact=True).first.click()
            await page.get_by_label("Apelido da conta", exact=True).fill(
                "Conta de primeiro uso"
            )
            await page.get_by_role(
                "button", name=re.compile("^Casa da nova conta ")
            ).click()
            await (
                page.get_by_role("dialog", name="Casa da nova conta", exact=True)
                .get_by_role("button", name="Betano", exact=True)
                .click()
            )
            async with page.expect_response(
                lambda response: (
                    response.request.method == "POST"
                    and "/api/v1/titulares/" in response.url
                    and response.url.endswith("/contas")
                )
            ) as created:
                await page.get_by_role(
                    "button", name="Cadastrar conta", exact=True
                ).click()
            account = await (await created.value).json()
            assert account["estado"] == "DISPONIVEL" and not account["ativa"]
            await expect(
                page.get_by_text(
                    "Conta cadastrada. A ativação é uma ação separada.", exact=True
                )
            ).to_be_visible()
            measured()
            task, started = "retomar_e_registrar", time.monotonic()
            await page.goto(address)
            await expect(
                page.get_by_role("heading", name="Registre sua primeira aposta")
            ).to_be_visible()
            for theme in ("claro", "escuro"):
                await page.evaluate(
                    "value => {document.documentElement.dataset.tema=value;window.scrollTo(0,0)}",
                    theme,
                )
                await page.screenshot(
                    path=str(trace_dir / (stem + "-" + theme + ".png")), full_page=True
                )
            await page.get_by_role(
                "link", name="Registrar uma aposta", exact=True
            ).click()
            await manual.fill(
                page, "Primeira aposta pela SPA", account="Conta de primeiro uso"
            )
            await page.get_by_label("Data/hora do jogo", exact=True).fill(
                "18/10/2026 19:00-03:00"
            )
            await page.get_by_role(
                "button", name="Registrar aposta", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "heading", name="Registro manual confirmado", exact=True
                )
            ).to_be_visible()
            intent = parse_qs(urlparse(page.url).query)["manual_intencao"][0]
            receipt = await core.request(page, manual.P + intent)
            assert (
                receipt["status"] == 200 and receipt["data"]["estado"] == "confirmada"
            )
            assert receipt["data"]["confirmacao_original"]["conta_casa_id"] == str(
                account["conta_casa_id"]
            )
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text(
                            "SELECT count(*) FROM apostas WHERE usuario_id=:uid AND chave=:key"
                        ),
                        {
                            "uid": user["usuario_id"],
                            "key": receipt["data"]["aposta_chave"],
                        },
                    )
                    == 1
                )
            await page.goto(address)
            await expect(
                page.get_by_role("heading", name="Suas apostas já estão no site")
            ).to_be_visible()
            measured()
            task, started = "canal_indisponivel", time.monotonic()
            await page.get_by_role(
                "link", name="Ver disponibilidade da extensão"
            ).click()
            await expect(
                page.get_by_role("heading", name="O download ainda não está disponível")
            ).to_be_visible()
            await page.go_back()
            await expect(
                page.get_by_role("link", name="Preparar conexão com Telegram")
            ).to_be_visible()
            assert await page.locator("select,input[type=date]").count() == 0
            assert not await page.evaluate(
                "Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(key => /onboarding|conclu|inicio/i.test(key))"
            )
            measured()
        except Exception:
            measurements.append(
                {
                    "task": task,
                    "result": "error",
                    "duration_ms": round((time.monotonic() - started) * 1000),
                }
            )
            try:
                await page.screenshot(
                    path=str(trace_dir / (stem + "-failure.png")), full_page=True
                )
            except BrowserError:
                pass
            raise
        finally:
            (trace_dir / (stem + "-tasks.json")).write_text(
                json.dumps(measurements), encoding="utf8"
            )
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await browser.close()
