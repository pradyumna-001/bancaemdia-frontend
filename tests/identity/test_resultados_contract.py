"""Results gestures through the public SPA, actual issuer/API/PostgreSQL."""

import asyncio
import importlib.util
import json
import os
import secrets
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_results_core", Path(__file__).with_name("test_core_contract.py")
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
async def test_public_spa_resultados_gestures_undo_recovery(
    harness, engine_admin, viewport, browser_name
):
    await harness.restart()
    directory = Path(os.environ["CORE_TRACE_DIR"])
    trace = directory / f"resultados-{browser_name}-{viewport['width']}.zip"
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
        holder = await core.write(
            page, "/api/v1/titulares", {"nome": "Resultados"}, expected=201
        )
        account = await core.write(
            page,
            f"/api/v1/titulares/{holder['id']}/contas",
            {"casa_id": house, "apelido": "Conta de resultados"},
            expected=201,
        )
        keys = []
        for index in range(53):
            instant = datetime(2026, 10, 10, 15, tzinfo=UTC) + timedelta(minutes=index)
            value = await core.write(
                page,
                "/api/v1/apostas",
                {
                    "casa": "Betano",
                    "evento": f"Resultado real {index:02d}",
                    "descricao": "Mais de 2,5 gols",
                    "odd": 2,
                    "stake_unidades": 1,
                    "data_aposta": "2026-10-09T12:00:00Z",
                    "data_jogo": instant.isoformat(),
                    "conta_casa_ref": account["conta_casa_id"],
                    "freebet": index == 2,
                },
                expected=201,
            )
            keys.append(value["aposta"]["chave"])
        writes = []
        page.on(
            "request",
            lambda request: (
                writes.append(request.method)
                if request.method == "POST"
                and "/api/v1/resultados/operacoes/" in request.url
                else None
            ),
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await page.goto(backend.FRONT + f"/resultados?casa={house}")
            await expect(
                page.get_by_role("heading", name="Resultado real 00", exact=True)
            ).to_be_visible()
            await page.evaluate("""() => {
              window.resultInteraction = [];
              if (PerformanceObserver.supportedEntryTypes.includes('event')) {
                new PerformanceObserver(list => window.resultInteraction.push(...list.getEntries().map(e => e.duration)))
                  .observe({type:'event', buffered:true, durationThreshold:16});
              }
            }""")
            green = page.get_by_role("button", name="GREEN", exact=True)
            for index in range(20):
                await expect(
                    page.get_by_role(
                        "heading", name=f"Resultado real {index:02d}", exact=True
                    )
                ).to_be_visible()
                await expect(green).to_be_enabled()
                await green.click()
                await expect(
                    page.get_by_role(
                        "button",
                        name=f"Desfazer Resultado real {index:02d}",
                        exact=True,
                    )
                ).to_be_visible()
            assert len(writes) == 20
            await expect(green).to_be_enabled()
            await page.get_by_role(
                "button", name="Carregar próximas apostas", exact=True
            ).click()
            await expect(
                page.get_by_text("Resultado real 52", exact=True)
            ).to_be_visible()
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text(
                            "SELECT count(*) FROM result_operations WHERE usuario_id=:uid"
                        ),
                        {"uid": uid},
                    )
                    == 20
                )
            # A valid undo restores the authoritative pre-image. The current queue restarts.
            await page.get_by_role(
                "button", name="Desfazer Resultado real 19", exact=True
            ).click()
            await expect(
                page.get_by_role("heading", name="Resultado real 19", exact=True)
            ).to_be_visible()
            assert len(writes) == 21

            # Disconnect the transport AFTER the real API commits. No response is fabricated.
            async def disconnect_after_commit(route):
                response = await route.fetch()
                assert response.status == 200
                await route.abort("failed")

            pattern = "**/api/v1/resultados/operacoes/*"
            await page.route(pattern, disconnect_after_commit, times=1)
            await expect(green).to_be_enabled()
            await green.click()
            await expect(
                page.get_by_role("heading", name="Consultar este pedido", exact=True)
            ).to_be_visible()
            await page.get_by_role(
                "button", name="Consultar resultado do pedido", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "button", name="Desfazer Resultado real 19", exact=True
                )
            ).to_be_visible()
            assert len(writes) == 22
            # Legacy/other-origin settlement invalidates even the same nominal GREEN.
            await core.write(
                page,
                "/api/v1/apostas/" + quote(keys[0], safe="") + "/resultado",
                {"estado": "GREEN", "retorno_centavos": 30000},
            )
            await expect(green).to_be_enabled()
            await page.get_by_role(
                "button", name="Desfazer Resultado real 00", exact=True
            ).click()
            await expect(
                page.get_by_role("button", name="Consultar aposta atual", exact=True)
            ).to_be_visible()
            assert len(writes) == 23
            current = await core.request(
                page, "/api/v1/resultados/apostas/" + quote(keys[0], safe="")
            )
            assert (
                current["status"] == 200
                and current["data"]["retorno_centavos"] == 30000
            )
            await page.get_by_role(
                "button", name="Consultar aposta atual", exact=True
            ).click()
            await expect(
                page.get_by_role(
                    "button",
                    name="Alterada depois da confirmação Resultado real 00",
                    exact=True,
                )
            ).to_be_disabled()
            await expect(green).to_be_enabled()
            # The immutable trial expires naturally; no entitlement guard is bypassed.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await green.click()
            await expect(
                page.get_by_role("heading", name="Resultados em consulta", exact=True)
            ).to_be_visible()
            assert len(writes) == 23
            assert (await core.request(page, "/auth/session"))["status"] == 200
            # GET receipt/state belong to the owner, even with a second real identity.
            other = await browser.new_context(viewport=viewport)
            other_page = await other.new_page()
            await backend.register(
                other_page,
                uuid4().hex + "@example.org",
                secrets.token_urlsafe(24),
                harness=harness,
            )
            assert (
                await core.request(
                    other_page, "/api/v1/resultados/apostas/" + quote(keys[0], safe="")
                )
            )["status"] == 404
            await other.close()
            metrics = await page.evaluate(
                "() => ({eventTiming: PerformanceObserver.supportedEntryTypes.includes('event'), durations: window.resultInteraction})"
            )
            if browser_name == "chromium":
                assert metrics["eventTiming"]
                assert max(metrics["durations"], default=0) < 200
            (
                directory / f"resultados-inp-{browser_name}-{viewport['width']}.json"
            ).write_text(json.dumps(metrics))
            await page.set_viewport_size({"width": 320, "height": 844})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            )
            session = (await core.request(page, "/auth/session"))["data"]
            assert (
                await core.request(
                    page, "/auth/logout", method="POST", csrf=session["csrf_token"]
                )
            )["status"] == 204
            await page.reload()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert (
                await page.get_by_role("button", name="Desfazer", exact=False).count()
                == 0
            )
        finally:
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await browser.close()
