"""Public SPA multipart -> real API/inbox/Redis/Celery -> actual review results.

Synthetic raster/extraction cache inputs only. No status, result, review or financial
fact is seeded; an owned provider trap refuses any paid extraction on cache miss.
"""

import asyncio
import hashlib
import importlib.util
import io
import os
import secrets
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest
import redis
from PIL import Image
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_print_core", Path(__file__).with_name("test_core_contract.py")
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
async def test_public_spa_prints_real_worker(
    harness, engine_admin, viewport, browser_name
):
    from bancaemdia.cache.extracao_cache import ExtracaoCache, LeituraGuardada
    from bancaemdia.cache.telegram_cache import TelegramExtractionCache
    from bancaemdia.extracao.cliente import VERSAO_PROMPT
    from bancaemdia.extracao.modelos import ExtracaoBilhete, Selecao
    from bancaemdia.integrations.telegram.codec import _fernet

    calls = []

    class Trap(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            calls.append(1)
            self.send_error(503)

    trap = ThreadingHTTPServer(("127.0.0.1", 0), Trap)
    Thread(target=trap.serve_forever, daemon=True).start()
    harness.env.update(
        REDIS_URL="redis://127.0.0.1:56379/2",
        CELERY_BROKER_URL="redis://127.0.0.1:56379/0",
        CELERY_RESULT_BACKEND="redis://127.0.0.1:56379/1",
        ANTHROPIC_API_KEY="sandbox-no-provider-credential",
        ANTHROPIC_BASE_URL=f"http://127.0.0.1:{trap.server_port}",
        ANTHROPIC_MAX_RETRIES="0",
    )
    cache = redis.Redis.from_url("redis://127.0.0.1:56379/2")
    assert cache.ping()
    trace = (
        Path(os.environ["CORE_TRACE_DIR"])
        / f"prints-{browser_name}-{viewport['width']}.zip"
    )
    with tempfile.TemporaryFile(mode="w+t") as worker_log:
        try:
            await harness.restart()
            worker = await asyncio.to_thread(
                subprocess.Popen,
                [
                    sys.executable,
                    "-m",
                    "celery",
                    "-A",
                    "bancaemdia.workers.celery_app:app",
                    "worker",
                    "--pool=solo",
                    "--concurrency=1",
                    "--loglevel=WARNING",
                    "--without-gossip",
                    "--without-mingle",
                ],
                cwd=harness.root,
                env=harness.env,
                stdout=worker_log,
                stderr=subprocess.STDOUT,
            )
            harness.processes.append(worker)
            await asyncio.sleep(2)
            assert worker.poll() is None, "Real prints worker must start"
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
                async with engine_admin.begin() as conn:
                    house = await conn.scalar(
                        text(
                            "INSERT INTO casas(nome,dominio) VALUES('Betano','betano.com') RETURNING id"
                        )
                    )
                holder = await core.write(
                    page, "/api/v1/titulares", {"nome": "Prints"}, expected=201
                )
                account = await core.write(
                    page,
                    f"/api/v1/titulares/{holder['id']}/contas",
                    {"casa_id": house, "apelido": "Prints"},
                    expected=201,
                )
                # Synthetic account attribution input, never a seeded bet/result.
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
                images = []
                for color in ((10, 30, 50), (50, 30, 10)):
                    buffer = io.BytesIO()
                    Image.new("RGB", (800, 600), color).save(buffer, format="PNG")
                    images.append(buffer.getvalue())
                golden = LeituraGuardada(
                    cupons=[
                        ExtracaoBilhete(
                            casa="Betano",
                            evento="Casa x Fora",
                            tipo="simples",
                            selecoes=[Selecao(mercado="Resultado", escolha="Casa")],
                            odd_total=2,
                            stake_unidades=None,
                            quando="2026-10-13T12:00:00-03:00",
                            confianca=0.99,
                        )
                    ],
                    modelo="claude-haiku-4-5",
                )
                settings = SimpleNamespace(
                    COLETA_TOKEN_SECRET=harness.env["COLETA_TOKEN_SECRET"]
                )
                with (
                    patch(
                        "bancaemdia.integrations.telegram.codec.get_settings",
                        return_value=settings,
                    ),
                    patch(
                        "bancaemdia.services.telegram_link.get_settings",
                        return_value=settings,
                    ),
                ):
                    private_cache = TelegramExtractionCache(ExtracaoCache(cache), uid)
                    for image in images:
                        key = (
                            private_cache.prefix
                            + hashlib.sha256(image).hexdigest()
                            + ":"
                            + VERSAO_PROMPT
                        )
                        cache.set(
                            key,
                            _fernet().encrypt(golden.model_dump_json().encode()),
                            ex=300,
                        )
                writes = []
                page.on(
                    "request",
                    lambda request: (
                        writes.append(1)
                        if "/api/v1/prints/" in request.url and request.method == "POST"
                        else None
                    ),
                )
                held_item = None

                async def partial_response(route):
                    nonlocal held_item
                    request = route.request
                    if request.method == "POST" and len(writes) == 3:
                        accepted = await route.fetch()
                        assert accepted.status == 202
                        held_item = request.url.rsplit("/", 1)[-1]
                        await route.abort("failed")
                    elif request.method == "GET" and held_item:
                        if request.url.endswith("/itens/" + held_item):
                            held_item = None
                            await route.continue_()
                        elif "/itens/" not in request.url:
                            # A real network outage hides batch polling until the
                            # person explicitly checks the uncertain item.
                            await route.abort("failed")
                        else:
                            await route.continue_()
                    else:
                        await route.continue_()

                await page.route("**/api/v1/prints/**", partial_response)
                await context.tracing.start(
                    screenshots=False, snapshots=False, sources=False
                )
                try:
                    await page.goto(
                        backend.FRONT
                        + f"/enviar?entrada=prints&casa={house}&apagadas=1"
                    )
                    await page.get_by_label(
                        "Imagens dos bilhetes", exact=True
                    ).set_input_files(
                        [
                            {
                                "name": "primeiro.png",
                                "mimeType": "image/png",
                                "buffer": images[0],
                            },
                            {
                                "name": "repetido.png",
                                "mimeType": "image/png",
                                "buffer": images[0],
                            },
                            {
                                "name": "segundo.png",
                                "mimeType": "image/png",
                                "buffer": images[1],
                            },
                        ]
                    )
                    await expect(
                        page.get_by_text(
                            "Imagem repetida na seleção. O serviço confirma se já foi recebida."
                        )
                    ).to_be_visible()
                    assert not writes
                    await expect(
                        page.get_by_role("button", name="Enviar prints selecionados")
                    ).to_be_enabled()
                    await page.get_by_role(
                        "button", name="Enviar prints selecionados"
                    ).focus()
                    await page.keyboard.press("Enter")
                    await expect(
                        page.get_by_role("button", name="Conferir print 3", exact=True)
                    ).to_be_enabled()
                    assert len(writes) == 3
                    await page.get_by_role(
                        "button", name="Conferir print 3", exact=True
                    ).click()
                    await expect(
                        page.get_by_text("Print já recebido", exact=True)
                    ).to_be_visible(timeout=60000)
                    await expect(
                        page.get_by_text("Precisa de Revisão", exact=True)
                    ).to_have_count(2, timeout=60000)
                    query = parse_qs(urlsplit(page.url).query)
                    assert query["casa"] == [str(house)] and query["apagadas"] == ["1"]
                    assert len(query["item"]) == 3 and len(writes) == 3
                    path = "/api/v1/prints/intencoes/" + query["prints"][0]
                    result = await core.request(page, path)
                    assert (
                        result["status"] == 200
                        and result["data"]["received_items"]
                        == result["data"]["terminal_items"]
                        == 3
                    )
                    assert all(
                        item["status"] == "completed" and item["results"]
                        for item in result["data"]["items"]
                    )
                    async with engine_admin.connect() as conn:
                        assert (
                            await conn.scalar(
                                text(
                                    "SELECT count(*) FROM apostas WHERE usuario_id=:uid"
                                ),
                                {"uid": uid},
                            )
                            == 0
                        )
                        assert (
                            await conn.scalar(
                                text(
                                    "SELECT count(*) FROM revisao_pendente WHERE usuario_id=:uid"
                                ),
                                {"uid": uid},
                            )
                            == 2
                        )
                    await core.accessibility(page)
                    await page.reload()
                    await expect(
                        page.get_by_text("Print já recebido", exact=True)
                    ).to_be_visible()
                    assert len(writes) == 3 and not calls
                    review_ids = {
                        rid
                        for item in result["data"]["items"]
                        for outcome in item["results"]
                        for rid in outcome["review_ids"]
                    }
                    assert len(review_ids) == 2
                    await page.get_by_role(
                        "link", name="Abrir Revisão", exact=True
                    ).first.click()
                    await expect(
                        page.get_by_label("Valor em unidades", exact=True)
                    ).to_be_visible()
                    await page.get_by_label("Valor em unidades", exact=True).fill("1")
                    await page.get_by_role(
                        "button", name="Salvar correção", exact=True
                    ).click()
                    await expect(
                        page.get_by_text(
                            "Revisão resolvida. A fila foi consultada novamente desde o início.",
                            exact=True,
                        )
                    ).to_be_visible()
                    async with engine_admin.connect() as conn:
                        bet = (
                            (
                                await conn.execute(
                                    text(
                                        "SELECT chave,conta_casa_id,stake_centavos,valor_aposta_centavos FROM apostas WHERE usuario_id=:uid"
                                    ),
                                    {"uid": uid},
                                )
                            )
                            .mappings()
                            .one()
                        )
                        assert bet["conta_casa_id"] == account["conta_casa_id"]
                        assert (
                            bet["stake_centavos"] > 0
                            and bet["stake_centavos"] == bet["valor_aposta_centavos"]
                        )
                    assert len(writes) == 3 and not calls, (
                        "Resolving a Print may not re-upload images or call the provider"
                    )
                    await page.set_viewport_size({"width": 320, "height": 844})
                    assert await page.evaluate(
                        "document.documentElement.scrollWidth <= innerWidth"
                    )
                finally:
                    await context.tracing.stop(path=trace)
                    core.sanitize_trace(trace)
                    await context.close()
                    await browser.close()
        finally:
            cache.close()
            trap.shutdown()
            trap.server_close()
