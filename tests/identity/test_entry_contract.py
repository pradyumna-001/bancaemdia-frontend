"""Entry faults against actual upload/worker/database, never fabricated responses."""

import asyncio
import importlib.util
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest
from playwright.async_api import expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_entry_core", Path(__file__).with_name("test_core_contract.py")
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
async def test_entry_export_lost_response_and_real_limit(
    harness, engine_admin, viewport, browser_name
):
    async def faults(pages, archive, original_job, owner, engine):
        page, other = pages
        requests = []
        page.on(
            "request",
            lambda r: (
                requests.append(r.method)
                if r.method == "POST" and urlsplit(r.url).path == "/api/v1/upload"
                else None
            ),
        )
        await core.fresh_session(page)
        await page.goto(
            core.backend.FRONT
            + "/enviar?envio="
            + original_job
            + "&estado=GREEN&apagadas=1"
        )
        await expect(
            page.get_by_role("heading", name="Importação concluída", exact=True)
        ).to_be_visible()
        # The completed original upload imposes the real five-minute interval.
        # Never change its timestamp or fake a 429/Retry-After.
        await page.get_by_role(
            "button", name="Escolher outro arquivo", exact=True
        ).click()
        await page.get_by_label("Arquivo do export", exact=True).set_input_files(
            {"name": "repetido.zip", "mimeType": "application/zip", "buffer": archive}
        )
        async with page.expect_response(
            lambda r: (
                urlsplit(r.url).path == "/api/v1/upload" and r.request.method == "POST"
            )
        ) as refused:
            await page.get_by_role("button", name="Enviar export", exact=True).click()
        response = await refused.value
        assert response.status == 429 and int(response.headers["retry-after"]) > 60
        await expect(
            page.get_by_text("Arquivo escolhido: repetido.zip", exact=True)
        ).to_be_visible()
        await expect(
            page.get_by_role("button", name="Enviar export", exact=True)
        ).to_be_disabled()
        await asyncio.sleep(2)
        assert requests == ["POST"], "Rate-limit refusal may not replay an upload"

        await core.fresh_session(other)
        second_owner = (await core.request(other, "/auth/session"))["data"][
            "usuario_id"
        ]
        lost = []

        async def lose_after_commit(route):
            if route.request.method != "POST":
                return await route.continue_()
            accepted = await route.fetch()
            assert accepted.status == 202
            lost.append((await accepted.json())["job_id"])
            await route.abort("failed")

        await other.route("**/api/v1/upload", lose_after_commit)
        await other.goto(core.backend.FRONT + "/enviar?casa=7&apagadas=1")
        await other.get_by_label("Arquivo do export", exact=True).set_input_files(
            {
                "name": "sem-resposta.zip",
                "mimeType": "application/zip",
                "buffer": archive,
            }
        )
        await other.get_by_role("button", name="Enviar export", exact=True).click()
        await expect(
            other.get_by_text(
                "Sem o endereço de acompanhamento, o serviço não permite", exact=False
            )
        ).to_be_visible()
        assert len(lost) == 1 and "envio" not in parse_qs(urlsplit(other.url).query)
        assert (await core.request(page, "/api/v1/upload/" + lost[0]))["status"] == 404
        # The test can observe the genuine receipt. The SPA has no returned UUID
        # and must continue describing its own GET as non-conclusive.
        for _ in range(60):
            actual = await core.request(other, "/api/v1/upload/" + lost[0])
            assert actual["status"] == 200
            if actual["data"]["status"] == "completed":
                break
            await asyncio.sleep(1)
        else:
            pytest.fail("Actual worker did not finish the committed upload")
        assert actual["data"]["bets_processed"] == 1
        await other.get_by_role("button", name="Conferir resultado", exact=True).click()
        await expect(
            other.get_by_text(
                "Esse total não confirma quais vieram deste envio.", exact=False
            )
        ).to_be_visible()
        await expect(
            other.get_by_role("button", name="Enviar export", exact=True)
        ).to_be_disabled()
        assert len(lost) == 1
        await other.get_by_role(
            "button", name="Iniciar um novo envio", exact=True
        ).click()
        await expect(other.get_by_label("Arquivo do export", exact=True)).to_have_value(
            ""
        )
        await expect(
            other.get_by_role("button", name="Enviar export", exact=True)
        ).to_be_disabled()
        assert len(lost) == 1
        async with engine.connect() as conn:
            for uid in (owner, second_owner):
                for table in ("uploads", "apostas"):
                    assert (
                        await conn.scalar(
                            text(f"SELECT count(*) FROM {table} WHERE usuario_id=:uid"),
                            {"uid": uid},
                        )
                        == 1
                    )

    await core.helpers.test_public_spa_telegram_import(
        harness,
        engine_admin,
        viewport,
        browser_name=browser_name,
        after_import=faults,
        trace_dir=Path(os.environ["CORE_TRACE_DIR"]),
        sanitize_trace=core.sanitize_trace,
    )
