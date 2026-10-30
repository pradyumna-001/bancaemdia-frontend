"""Manual creation through the public SPA, real API/issuer and PostgreSQL."""

import asyncio
import importlib.util
import os
import re
import secrets
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_manual_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
backend = core.backend
P = "/api/v1/apostas-manuais/operacoes/"


async def fill(page, event, *, freebet=False, account=None):
    await expect(
        page.get_by_role("heading", name="Nova aposta", exact=True)
    ).to_be_visible()
    await page.get_by_role("button", name=re.compile("^Casa ")).click()
    await page.get_by_role("button", name="Betano", exact=True).click()
    await page.get_by_label("Odd", exact=True).fill("2,35")
    await page.get_by_label("Valor em unidades", exact=True).fill("1")
    if freebet:
        freebet_option = page.get_by_label("Esta aposta é uma freebet")
        await freebet_option.click()
        await expect(freebet_option).to_be_checked()
    await page.get_by_text("Evento e outros detalhes (opcional)", exact=True).click()
    await page.get_by_label("Evento", exact=True).fill(event)
    if account:
        await page.get_by_role(
            "button", name=re.compile("^Conta que fez a aposta ")
        ).click()
        await page.get_by_role(
            "button", name=re.compile("^" + re.escape(account))
        ).click()


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_manual_creation_recovery(
    harness, engine_admin, viewport, browser_name
):
    await harness.restart()
    trace = (
        Path(os.environ["CORE_TRACE_DIR"])
        / f"manual-{browser_name}-{viewport['width']}.zip"
    )
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        contexts = [await browser.new_context(viewport=viewport) for _ in range(2)]
        page, other = [await context.new_page() for context in contexts]
        users = []
        for entry in (page, other):
            session, _ = await backend.register(
                entry,
                uuid4().hex + "@example.org",
                secrets.token_urlsafe(24),
                harness=harness,
            )
            users.append(session["usuario_id"])
        uid = users[0]
        expiry = await core.grant(page, engine_admin, uid, seconds=90)
        async with engine_admin.begin() as conn:
            house = await conn.scalar(
                text(
                    "INSERT INTO casas(nome,dominio) VALUES ('Betano','betano.com') RETURNING id"
                )
            )
        accounts = []
        for name in ("Principal manual", "Temporária manual"):
            holder = await core.write(
                page, "/api/v1/titulares", {"nome": "Titular " + name}, expected=201
            )
            accounts.append(
                await core.write(
                    page,
                    f"/api/v1/titulares/{holder['id']}/contas",
                    {"casa_id": house, "apelido": name},
                    expected=201,
                )
            )
        await core.fresh_session(page)
        writes = []
        response_statuses = []
        retry_deadline = 0

        def observe_response(response):
            nonlocal retry_deadline
            if P in response.url or response.url.endswith("/matriz"):
                response_statuses.append(
                    (
                        "manual" if P in response.url else "matriz",
                        response.status,
                        response.headers.get("retry-after"),
                    )
                )
                if P in response.url and response.status == 422:
                    retry_deadline = time.monotonic() + float(
                        response.headers.get("retry-after", "0")
                    )

        page.on("response", observe_response)

        def observe(request):
            if request.method == "POST" and P in request.url:
                intent = request.url.rsplit("/", 1)[-1]
                assert parse_qs(urlparse(page.url).query).get("manual_intencao") == [
                    intent
                ]
                writes.append(request)

        page.on("request", observe)
        lost = False

        async def lose_response(route):
            nonlocal lost
            if lost and route.request.method == "POST":
                lost = False
                await route.fetch()
                await route.abort("failed")
            else:
                await route.continue_()

        await page.route("**/api/v1/apostas-manuais/operacoes/*", lose_response)
        await contexts[0].tracing.start(
            screenshots=False, snapshots=False, sources=False
        )
        address = backend.FRONT + f"/aposta/nova?casa={house}&apagadas=1"
        try:
            await page.goto(address)
            await fill(page, "Manual comum real", account="Principal manual")
            await page.get_by_label("Data/hora da aposta", exact=True).fill(
                "15/10/2026 14:00-03:00"
            )
            await page.get_by_label("Data/hora do jogo", exact=True).fill(
                "16/10/2026 19:00-03:00"
            )
            await page.get_by_label("Comissão (R$)", exact=True).fill("2,50")
            await page.get_by_role(
                "button", name="Registrar aposta", exact=True
            ).click()
            await expect(
                page.get_by_role("heading", name="Manual comum real", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_role(
                    "heading", name="Registro manual confirmado", exact=True
                )
            ).to_be_visible()
            first_id = parse_qs(urlparse(page.url).query)["manual_intencao"][0]
            first = await core.request(page, P + first_id)
            assert first["status"] == 200
            original = first["data"]["confirmacao_original"]
            assert original["conta_casa_id"] == str(accounts[0]["conta_casa_id"])
            assert original["comissao_centavos"] == "250" and not original["freebet"]
            assert original["stake_centavos"] == original["valor_aposta_centavos"]
            assert datetime.fromisoformat(original["data_jogo"]) == datetime(
                2026, 10, 16, 22, tzinfo=UTC
            )
            assert unquote(urlparse(page.url).path).endswith(
                first["data"]["aposta_chave"]
            )

            await core.fresh_session(page)
            await page.goto(address)
            await fill(page, "Freebet real recuperada", freebet=True)
            lost = True
            await page.get_by_role(
                "button", name="Registrar aposta", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "heading", name="Confira se o pedido foi concluído", exact=True
                )
            ).to_be_visible()
            assert len(writes) == 2
            # Reload loses the original body but keeps the public recovery UUID.
            recovery_url = page.url
            await page.reload()
            await expect(
                page.get_by_text(
                    "Os campos anteriores não são guardados após sair.", exact=False
                )
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Reenviar este mesmo pedido")
            ).to_have_count(0)
            await page.get_by_role(
                "button", name="Consultar registro", exact=True
            ).click()
            await expect(
                page.get_by_role("heading", name="Freebet real recuperada", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_text(
                    "A conta desta aposta precisa ser identificada.", exact=False
                )
            ).to_be_visible()
            second_id = parse_qs(urlparse(recovery_url).query)["manual_intencao"][0]
            second = (await core.request(page, P + second_id))["data"]
            assert second["confirmacao_original"]["freebet"]
            assert second["confirmacao_original"]["stake_centavos"] == "0"
            assert (
                second["confirmacao_original"]["valor_aposta_centavos"]
                == second["confirmacao_original"]["valor_unidade_centavos"]
            )
            assert len(writes) == 2
            await expect(
                page.get_by_role("link", name="Conferir conta na Revisão")
            ).to_have_attribute("href", re.compile("revisao_item="))

            await core.fresh_session(page)
            await page.goto(address)
            await fill(
                page, "Campos preservados após recusa", account="Temporária manual"
            )
            # Remove only an unused synthetic account between choice and commit.
            async with engine_admin.begin() as conn:
                await conn.execute(
                    text("DELETE FROM contas_casa WHERE id=:id AND usuario_id=:uid"),
                    {"id": accounts[1]["conta_casa_id"], "uid": uid},
                )
            await page.get_by_role(
                "button", name="Registrar aposta", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "heading", name="Confira os dados do pedido", exact=True
                )
            ).to_be_visible()
            await expect(page.get_by_label("Evento", exact=True)).to_have_value(
                "Campos preservados após recusa"
            )
            # The real rate limiter publishes Retry-After even on this 422.
            # Respect it; do not bypass the deadline or the 30-second identity.
            await asyncio.sleep(max(0, retry_deadline - time.monotonic()) + 0.2)
            # Exercise a real return (blur/focus), including Web Lock and
            # HttpOnly refresh, without leaving the memory-only form or injecting auth.
            async with page.expect_response(
                lambda response: (
                    urlparse(response.url).path == "/auth/session"
                    and response.status == 200
                )
            ):
                await page.evaluate(
                    "window.dispatchEvent(new Event('blur'));"
                    "window.dispatchEvent(new Event('focus'))"
                )
            try:
                await expect(page.get_by_label("Evento", exact=True)).to_be_enabled()
            except AssertionError as error:
                recovery = await page.get_by_role(
                    "heading", name="Confira o registro antes de continuar", exact=True
                ).count()
                submit = await page.get_by_role(
                    "button", name=re.compile("Registrar aposta|Registrando aposta")
                ).text_content()
                raise AssertionError(
                    f"Manual correction locked: recovery={recovery}, submit={submit}, "
                    f"safe HTTP statuses={response_statuses}"
                ) from error
            rejected_id = parse_qs(urlparse(page.url).query)["manual_intencao"][0]
            await page.get_by_role(
                "button", name=re.compile("^Conta que fez a aposta ")
            ).click()
            await page.get_by_role(
                "button", name="Atribuir pela data do jogo", exact=True
            ).click()
            await page.get_by_role(
                "button", name="Registrar aposta", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "heading", name="Campos preservados após recusa", exact=True
                )
            ).to_be_visible()
            assert parse_qs(urlparse(page.url).query)["manual_intencao"] == [
                rejected_id
            ]
            assert len(writes) == 4
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM apostas WHERE usuario_id=:uid"),
                        {"uid": uid},
                    )
                    == 3
                )
                assert (
                    await conn.scalar(
                        text(
                            "SELECT count(*) FROM manual_creation_operations WHERE usuario_id=:uid"
                        ),
                        {"uid": uid},
                    )
                    == 3
                )

            await asyncio.sleep(max(0, expiry - time.time() + 1))
            # Observe the SPA's authenticated read, including its session renewal,
            # rather than issuing a second raw fetch outside the client policy.
            async with page.expect_response(
                lambda response: (
                    response.url.endswith("/api/v1/billing/status")
                    and response.request.method == "GET"
                    and response.status == 200
                )
            ) as status_response:
                await core.fresh_session(page)
            assert (await (await status_response.value).json())["access"] == "READ_ONLY"
            await page.goto(address + "&manual_intencao=" + first_id)
            await page.get_by_role(
                "button", name="Consultar registro", exact=True
            ).click()
            await expect(
                page.get_by_role("heading", name="Manual comum real", exact=True)
            ).to_be_visible()
            await page.goto(address)
            await expect(
                page.get_by_role("button", name="Registrar aposta", exact=True)
            ).to_be_disabled()
            assert len(writes) == 4
            await core.fresh_session(other)
            assert (await core.request(other, P + first_id))["status"] == 404
        finally:
            await contexts[0].tracing.stop(path=trace)
            core.sanitize_trace(trace)
            for context in contexts:
                await context.close()
            await browser.close()
