"""Real cookie contract from the public SPA; no session override enters its bundle.

Run with the pinned backend as cwd, after building the frontend. Its sandbox fixtures
own disposable PostgreSQL/OIDC/SMTP. This server stands in for the same-origin proxy.
"""

import asyncio
import io
import json
import mimetypes
import os
import re
import secrets
import subprocess
import sys
import tempfile
import time
import zipfile
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qsl, urlsplit
from uuid import uuid4

import httpx
import pytest
import redis
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from tests.conftest import _preparar

from tests.identity import journey as backend

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


def serve_public_build(directory=DIST, security_directory=ROOT / "dist-security"):
    security = (security_directory / "default.conf").read_text()
    csp = re.search(r'add_header Content-Security-Policy "([^"]+)"', security).group(1)
    assert "connect-src 'self'" in csp and "unsafe-inline" not in csp

    class PublicBuild(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass  # Cookie, CSRF, protocol URLs and personal data stay out of logs.

        def handle_request(self):
            path = urlsplit(self.path).path
            if path.startswith(("/auth/", "/api/")):
                body = self.rfile.read(int(self.headers.get("content-length", "0")))
                headers = {
                    k: v
                    for k, v in self.headers.items()
                    if k.lower() not in {"host", "connection", "accept-encoding"}
                }
                with httpx.Client(timeout=15, follow_redirects=False) as client:
                    result = client.request(
                        self.command,
                        backend.API + self.path,
                        headers=headers,
                        content=body,
                    )
                self.send_response(result.status_code)
                for key, value in result.headers.multi_items():
                    if key.lower() not in {
                        "transfer-encoding",
                        "content-length",
                        "connection",
                        "content-encoding",
                    }:
                        self.send_header(key, value)
                self.send_header("Content-Length", str(len(result.content)))
                self.end_headers()
                self.wfile.write(result.content)
                return
            if self.command != "GET":
                self.send_error(405)
                return
            if path == "/config.json":
                content = json.dumps({"VITE_API_URL": backend.FRONT}).encode()
                content_type = "application/json"
            else:
                target = (directory / path.lstrip("/")).resolve()
                if not target.is_relative_to(directory.resolve()):
                    self.send_error(404)
                    return
                if path.startswith(("/assets/", "/fontes/")) and not target.is_file():
                    self.send_error(404)
                    return
                if not target.is_file():
                    target = directory / "index.html"
                content = target.read_bytes()
                content_type = (
                    mimetypes.guess_type(target)[0] or "application/octet-stream"
                )
                if target.suffix == ".js":
                    content_type = "application/javascript"
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Security-Policy", csp)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        do_GET = handle_request
        do_POST = handle_request
        do_PATCH = handle_request
        do_DELETE = handle_request

    return ThreadingHTTPServer(("127.0.0.1", 58001), PublicBuild)


async def browser_request(page, path, *, method="GET", csrf=None, body=None):
    return await page.evaluate(
        """async ({path,method,csrf,body}) => {
          const headers={}; if(csrf) headers['X-CSRF-Token']=csrf;
          if(body) headers['Content-Type']='application/json';
          const response=await fetch(path, {method, credentials:'include', headers,
            cache:'no-store', body:body ? JSON.stringify(body) : undefined});
          return {status:response.status, data:await response.json(),
            headers:Object.fromEntries(response.headers)};
        }""",
        {"path": path, "method": method, "csrf": csrf, "body": body},
    )


async def complete_hosted_entry(page, email, password, destination):
    # Keycloak can remember a different SSO account and show password-only. The
    # hosted "reset-login" action selects another account without altering cookies.
    # Source: keycloak/keycloak 26.7.4, base/login/template.ftl.
    try:
        await page.locator("#kc-form-login").wait_for()
        if not await page.locator("#username").is_visible():
            await page.locator("#reset-login").click()
        await page.locator("#username").fill(email)
        if not await page.locator("#password").count():
            await page.locator("#kc-login").click()
        await page.locator("#password").fill(password)
        await page.locator("#kc-login").click()
        await page.wait_for_url(destination, timeout=30000)
    except BrowserError:
        # Playwright diagnostics can contain protocol URLs or filled credentials.
        pytest.fail("Hosted account entry did not complete", pytrace=False)


@pytest.fixture
async def banco():
    # Each harness generates its own keyring. Never reuse encrypted rows from another
    # sandbox harness: its revocation outbox must remain with the keys that created it.
    url = make_url(os.environ["TEST_DATABASE_URL"])
    assert url.host == "127.0.0.1" and url.port == 55432
    assert url.database == "bancaemdia_identity", (
        "Only the disposable CI database is allowed"
    )
    name = "identity_frontend_" + uuid4().hex
    admin = create_async_engine(
        url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    try:
        async with admin.connect() as conn:
            await conn.execute(text(f"CREATE DATABASE {name}"))
        isolated_url = url.set(database=name).render_as_string(hide_password=False)
        yield await asyncio.to_thread(_preparar, isolated_url)
    finally:
        async with admin.connect() as conn:
            await conn.execute(text(f"DROP DATABASE {name}"))
        await admin.dispose()


@pytest.fixture
async def harness(banco, engine_admin, tmp_path, monkeypatch):
    assert (DIST / "index.html").is_file(), "Build the public SPA before acceptance"
    monkeypatch.setattr(backend, "serve_frontend", serve_public_build)
    monkeypatch.setattr(backend, "fetch", browser_request)
    async for instance in backend.harness.__wrapped__(banco, engine_admin, tmp_path):
        yield instance


@pytest.fixture
async def harness_filtros(banco, engine_admin, tmp_path, monkeypatch):
    directory = ROOT / "dist-apostas-fixture"
    assert (directory / "index.html").is_file(), (
        "Build the isolated dependency exercise"
    )
    monkeypatch.setattr(
        backend,
        "serve_frontend",
        lambda: serve_public_build(directory, ROOT / "dist-apostas-security"),
    )
    monkeypatch.setattr(backend, "fetch", browser_request)
    async for instance in backend.harness.__wrapped__(banco, engine_admin, tmp_path):
        yield instance


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_telegram_import(harness, engine_admin, viewport):
    """Real file, queue, worker, materialization and RLS; only extraction input is cached.

    No jobs, status, progress or final bets are inserted by the test. No paid IA is called.
    Cache misses hit an owned local trap and fail this proof instead of using a provider.
    """
    from bancaemdia.cache.extracao_cache import (
        LeituraGuardada,
        chave_de_imagem,
        chave_no_redis,
    )
    from bancaemdia.extracao.cliente import VERSAO_PROMPT
    from bancaemdia.extracao.modelos import ExtracaoBilhete, Selecao

    calls = []

    class ProviderTrap(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            calls.append("unexpected provider request")
            self.send_error(503)

    trap = ThreadingHTTPServer(("127.0.0.1", 0), ProviderTrap)
    Thread(target=trap.serve_forever, daemon=True).start()
    cache = redis.Redis.from_url("redis://127.0.0.1:56379/2")
    # Redis belongs only to upload-compose.yml in this ephemeral CI job.
    assert cache.ping()
    photo = b"\xff\xd8\xff\xe0sandbox-upload-input\xff\xd9"
    caption = "1u"
    posted_at = datetime.fromisoformat("2026-07-24T16:17:52")
    golden = LeituraGuardada(
        cupons=[
            ExtracaoBilhete(
                casa="Betano",
                tipo="simples",
                evento="Velez x Instituto",
                selecoes=[Selecao(mercado="Handicap", escolha="Instituto", odd=1.82)],
                odd_total=1.82,
                confianca=0.99,
            )
        ],
        modelo="claude-haiku-4-5",
    )
    # The pinned backend keys extraction by the exact message minute used in
    # the prompt, so the golden input must carry the same export timestamp.
    cache_key = chave_no_redis(
        chave_de_imagem(photo, caption, postada_em=posted_at), VERSAO_PROMPT
    )
    cache.set(cache_key, golden.model_dump_json(), ex=300)
    content = io.BytesIO()
    with zipfile.ZipFile(content, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "ChatExport/result.json",
            json.dumps(
                {
                    "name": "Canal descartável",
                    "type": "channel",
                    "id": 555,
                    "messages": [
                        {
                            "id": 71,
                            "type": "message",
                            "date": posted_at.isoformat(),
                            "from": "Teste",
                            "text": caption,
                            "photo": "photos/bilhete.jpg",
                        }
                    ],
                }
            ),
        )
        archive.writestr("ChatExport/photos/bilhete.jpg", photo)
    harness.env.update(
        REDIS_URL="redis://127.0.0.1:56379/2",
        CELERY_BROKER_URL="redis://127.0.0.1:56379/0",
        CELERY_RESULT_BACKEND="redis://127.0.0.1:56379/1",
        API_INTERNAL_URL=backend.API,
        UPLOAD_WEBHOOK_SECRET=secrets.token_urlsafe(32),
        ANTHROPIC_API_KEY="sandbox-no-provider-credential",
        ANTHROPIC_BASE_URL=f"http://127.0.0.1:{trap.server_port}",
        ANTHROPIC_MAX_RETRIES="0",
    )
    with tempfile.TemporaryFile(mode="w+t") as worker_log:
        worker = None
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
            if worker.poll() is not None:
                worker_log.seek(0)
                diagnostics = worker_log.read(65536)
                classes = sorted(
                    set(re.findall(r"(?m)^([\w.]+(?:Error|Exception)):", diagnostics))
                )
                modules = sorted(
                    set(re.findall(r"No module named '([\w.]+)'", diagnostics))
                )
                pytest.fail(
                    f"Worker exited before import: {worker.returncode}; classes={classes}; missing_modules={modules}"
                )
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch()
                contexts = [
                    await browser.new_context(viewport=viewport) for _ in range(2)
                ]
                pages = [await ctx.new_page() for ctx in contexts]
                for page in pages:
                    await backend.register(
                        page,
                        uuid4().hex + "@example.org",
                        secrets.token_urlsafe(24),
                        harness=harness,
                    )
                owner = (await browser_request(pages[0], "/auth/session"))["data"][
                    "usuario_id"
                ]
                async with engine_admin.connect() as conn:
                    assert await conn.scalar(text("SELECT count(*) FROM uploads")) == 0
                    assert await conn.scalar(text("SELECT count(*) FROM apostas")) == 0
                writes = []
                pages[0].on(
                    "request",
                    lambda request: (
                        writes.append(1)
                        if urlsplit(request.url).path == "/api/v1/upload"
                        and request.method == "POST"
                        else None
                    ),
                )
                await pages[0].goto(backend.FRONT + "/enviar?estado=GREEN&apagadas=1")
                await (
                    pages[0]
                    .get_by_label("Arquivo do export", exact=True)
                    .set_input_files(
                        {
                            "name": "ChatExport.zip",
                            "mimeType": "application/zip",
                            "buffer": content.getvalue(),
                        }
                    )
                )
                await (
                    pages[0]
                    .get_by_role("button", name="Enviar export", exact=True)
                    .click()
                )
                await expect(
                    pages[0].get_by_role(
                        "heading", name="Importação concluída", exact=True
                    )
                ).to_be_visible(timeout=60000)
                job_id = dict(parse_qsl(urlsplit(pages[0].url).query))["envio"]
                status = await browser_request(pages[0], "/api/v1/upload/" + job_id)
                assert status["status"] == 200 and status["data"]["bets_processed"] == 1
                assert status["data"]["status"] == "completed"
                assert status["data"]["cost_usd"] == 0
                assert not calls, (
                    "Extraction must use the golden cache, never a paid provider"
                )
                assert (await browser_request(pages[1], "/api/v1/upload/" + job_id))[
                    "status"
                ] == 404
                async with engine_admin.connect() as conn:
                    row = (
                        (
                            await conn.execute(
                                text(
                                    "SELECT usuario_id,chat_id,message_id,chave,odd FROM apostas"
                                )
                            )
                        )
                        .mappings()
                        .one()
                    )
                    assert row["usuario_id"] == owner and row["chat_id"] == 555
                    assert row["message_id"] == 71
                    assert float(row["odd"]) == 1.82
                    created = (
                        await conn.execute(
                            text(
                                "SELECT payload_json FROM eventos WHERE usuario_id=:owner "
                                "AND aposta_chave=:key AND tipo='APOSTA_CRIADA'"
                            ),
                            {"owner": owner, "key": row["chave"]},
                        )
                    ).scalar_one()
                    assert created["casa"].lower() == "betano"
                await pages[0].reload()
                await expect(
                    pages[0].get_by_role(
                        "heading", name="Importação concluída", exact=True
                    )
                ).to_be_visible()
                assert len(writes) == 1, "Reload resumes GET, never POST"
                assert (
                    dict(parse_qsl(urlsplit(pages[0].url).query))["estado"] == "GREEN"
                )
                assert (
                    not await pages[0]
                    .get_by_text(
                        re.compile("Autorizar|estimativa|custo", re.IGNORECASE)
                    )
                    .count()
                )
                await browser.close()
            assert worker.poll() is None, "Actual worker must survive the import"
        except BaseException:
            worker_log.seek(0)
            diagnostics = worker_log.read(65536)
            classes = sorted(
                set(re.findall(r"\b([\w.]+(?:Error|Exception)):", diagnostics))
            )
            modules = sorted(
                set(re.findall(r"No module named '([\w.]+)'", diagnostics))
            )
            print(
                f"Worker diagnostics: exit={worker.poll() if worker else None}; classes={classes}; missing_modules={modules}"
            )
            # Celery deliberately removes private exception text from its log.
            # Inspect only bounded state/type/source frames, never task values,
            # arguments, messages, credentials or raw result/traceback content.
            results = redis.Redis.from_url(harness.env["CELERY_RESULT_BACKEND"])
            try:
                for key in results.scan_iter(match="celery-task-meta-*", count=100):
                    item = json.loads(results.get(key) or "{}")
                    state = item.get("status")
                    if state not in {"FAILURE", "RETRY"}:
                        continue
                    value = item.get("result")
                    kind = value.get("exc_type") if isinstance(value, dict) else None
                    kind = (
                        kind
                        if isinstance(kind, str) and re.fullmatch(r"[\w.]+", kind)
                        else None
                    )
                    frames = re.findall(
                        r'File "[^"\n]*[/\\](bancaemdia[/\\][^"\n]+\.py)", line (\d+), in ([\w<>]+)',
                        item.get("traceback") or "",
                    )
                    print(
                        f"Worker task state={state}; class={kind}; frames={frames[-8:]}"
                    )
            finally:
                results.close()
            raise
        finally:
            cache.delete(cache_key)
            cache.close()
            await asyncio.to_thread(trap.shutdown)
            trap.server_close()


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_real_identity_cookie_contract(harness, viewport):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        contexts = [await browser.new_context(viewport=viewport) for _ in range(2)]
        pages = [await context.new_page() for context in contexts]
        violations = []
        for page in pages:

            def public_page_error(_error, current_page=page):
                if urlsplit(current_page.url).netloc == urlsplit(backend.FRONT).netloc:
                    violations.append("public SPA pageerror")

            page.on("pageerror", public_page_error)
            # This monitor belongs to the SPA, not the hosted issuer's documents. It
            # also records early CSP violations before documentElement exists.
            await page.add_init_script(
                "if (location.origin === "
                + json.dumps(backend.FRONT)
                + ") { document.addEventListener('securitypolicyviolation',"
                + "() => { window.__identityCspFailure=true; }); }"
            )
        sessions = []
        for page in pages:
            email = uuid4().hex + "@example.org"
            session, _ = await backend.register(
                page, email, secrets.token_urlsafe(24), harness=harness
            )
            sessions.append(session)
            await page.goto(backend.FRONT + "/login")
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert not await page.evaluate("window.__identityCspFailure === true")
            assert not {"access_token", "refresh_token", "id_token"}.intersection(
                session
            )
            assert await page.evaluate("Object.keys(localStorage).length") == 0
            assert await page.evaluate("Object.keys(sessionStorage).length") == 0
            if await page.evaluate("document.cookie"):
                pytest.fail("Session cookies must not be readable by scripts")
        assert sessions[0]["usuario_id"] != sessions[1]["usuario_id"]
        # Actual browser cookie authorization and CSRF; only disposable financial input.
        rejected = await browser_request(pages[0], "/auth/refresh", method="POST")
        assert rejected["status"] == 403 and rejected["data"]["code"] == "csrf_failed"
        renewed = await browser_request(
            pages[0], "/auth/refresh", method="POST", csrf=sessions[0]["csrf_token"]
        )
        assert renewed["status"] == 200
        live = renewed["data"]
        assert live["usuario_id"] == sessions[0]["usuario_id"]
        assert live["session_version"] != sessions[0]["session_version"]
        if live["csrf_token"] == sessions[0]["csrf_token"]:
            pytest.fail("Refresh must rotate the CSRF proof")
        created = await browser_request(
            pages[0],
            "/api/v1/apostas",
            method="POST",
            csrf=live["csrf_token"],
            body={"casa": "betano", "odd": 2, "stake_unidades": 1},
        )
        assert created["status"] == 201
        key = created["data"]["aposta"]["chave"]
        assert (await browser_request(pages[0], "/api/v1/apostas/" + key))[
            "status"
        ] == 200
        assert (await browser_request(pages[1], "/api/v1/apostas/" + key))[
            "status"
        ] == 404
        # The actual provider now owns cookie/CSRF lookup, clearing and confirmation.
        await pages[0].goto(backend.FRONT + "/sair")
        await pages[0].get_by_role("button", name="Confirmar saída").click()
        await expect(
            pages[0].get_by_role("heading", name="Entrar", exact=True)
        ).to_be_visible()
        assert (await browser_request(pages[0], "/auth/session"))["status"] == 401
        assert (await browser_request(pages[0], "/api/v1/apostas"))["status"] == 401
        assert (await browser_request(pages[1], "/auth/session"))["status"] == 200
        cache_control = (await browser_request(pages[1], "/auth/session"))["headers"][
            "cache-control"
        ]
        assert "no-store" in cache_control
        for context, page in zip(contexts, pages):
            assert not await page.evaluate("window.__identityCspFailure === true")
            assert all(c["httpOnly"] for c in await context.cookies(backend.FRONT))
            await page.goto(backend.FRONT + "/painel")
            await expect(
                page.get_by_role(
                    "heading",
                    name="Entrar" if page == pages[0] else "Painel",
                    exact=True,
                )
            ).to_be_visible()
            assert not await page.evaluate("window.__identityCspFailure === true")
        assert not violations
        await browser.close()


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_session_lifecycle(harness, engine_admin, viewport):
    """Real provider, Web Locks across tabs, cache switch and hosted return; no mock."""
    import jwt

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        a, b = [await browser.new_context(viewport=viewport) for _ in range(2)]
        pa, pb = await a.new_page(), await b.new_page()
        email_a, email_b = (uuid4().hex + "@example.org" for _ in range(2))
        password_a, password_b = (secrets.token_urlsafe(24) for _ in range(2))
        sa, _ = await backend.register(pa, email_a, password_a, harness=harness)
        sb, _ = await backend.register(pb, email_b, password_b, harness=harness)
        assert sa["usuario_id"] != sb["usuario_id"]
        live = (await browser_request(pa, "/auth/session"))["data"]
        created = await browser_request(
            pa,
            "/api/v1/apostas",
            method="POST",
            csrf=live["csrf_token"],
            body={"casa": "betano", "odd": 2, "stake_unidades": 1, "freebet": False},
        )
        assert created["status"] == 201
        # Add one disposable pending review, to distinguish the real per-user caches.
        initial_reviews = await browser_request(pa, "/api/v1/revisao/stats")
        assert initial_reviews["status"] == 200
        expected_total = initial_reviews["data"]["total"] + 1
        async with engine_admin.begin() as conn:
            result = await conn.execute(
                text(
                    "INSERT INTO revisao_pendente (usuario_id, motivo) VALUES (:id, 'sandbox')"
                ),
                {"id": sa["usuario_id"]},
            )
            assert result.rowcount == 1
        actual_reviews = await browser_request(pa, "/api/v1/revisao/stats")
        assert actual_reviews["status"] == 200
        assert actual_reviews["data"]["total"] == expected_total
        review_name = re.compile(rf"Revisão.*{expected_total} pendências")
        await pa.goto(backend.FRONT + "/painel?apagadas=1#serie")
        await expect(
            pa.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        await expect(pa.get_by_role("link", name=review_name).first).to_be_visible()
        second = await a.new_page()
        await second.goto(backend.FRONT + "/painel")
        await expect(
            second.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        _, credentials = await harness.credentials(a)
        expiration = jwt.decode(
            credentials["internal"], options={"verify_signature": False}
        )["exp"]
        await asyncio.sleep(max(0, expiration - time.time()) + 1)
        grants = harness.network.token_requests
        await asyncio.gather(
            pa.goto(backend.FRONT + "/painel?apagadas=1#serie"),
            second.goto(backend.FRONT + "/painel"),
        )
        for page in (pa, second):
            await expect(
                page.get_by_role("heading", name="Painel", exact=True)
            ).to_be_visible()
        assert harness.network.token_requests == grants + 1
        refresh_required = (await browser_request(pa, "/auth/session"))["data"][
            "refresh_required"
        ]
        assert refresh_required is False
        # Log in as B in one tab; the other mounted SPA must discard A's private cache.
        await second.goto(backend.FRONT + "/login?destino=%2Fpainel")
        await second.get_by_role("button", name="Entrar com minha conta").click()
        await complete_hosted_entry(
            second, email_b, password_b, backend.FRONT + "/painel"
        )
        await expect(pa.get_by_role("link", name=review_name)).to_have_count(0)
        await expect(
            pa.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        current_person = (await browser_request(pa, "/auth/session"))["data"][
            "usuario_id"
        ]
        assert current_person == sb["usuario_id"]
        assert (await browser_request(pa, "/api/v1/apostas"))["data"]["pagination"][
            "total"
        ] == 0
        await pa.goto(backend.FRONT + "/sair")
        await pa.get_by_role("button", name="Confirmar saída").click()
        await expect(
            pa.get_by_role("heading", name="Entrar", exact=True)
        ).to_be_visible()
        assert (await browser_request(second, "/auth/session"))["status"] == 401
        # A fresh hosted entry initiated by the real SPA preserves filters and hash.
        await pa.goto(backend.FRONT + "/login?destino=%2Fpainel%3Fapagadas%3D1%23serie")
        await pa.get_by_role("button", name="Entrar com minha conta").click()
        await complete_hosted_entry(
            pa, email_a, password_a, backend.FRONT + "/painel?apagadas=1#serie"
        )
        await expect(
            pa.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        assert await pa.evaluate("Object.keys(sessionStorage).length") == 0
        assert await pa.evaluate("Object.keys(localStorage).length") == 0
        assert not await pa.evaluate("document.cookie")
        await browser.close()


async def start_public_registration(page, email, destination):
    from urllib.parse import urlencode

    await page.goto(
        backend.FRONT + "/criar-conta?" + urlencode({"destino": destination})
    )
    await page.get_by_role("button", name="Continuar para criar conta").click()
    await page.get_by_role("link", name="Register", exact=True).click()
    await page.locator("#email").fill(email)
    await page.locator("#firstName").fill("Disposable")
    await page.locator("#lastName").fill("Acceptance")
    assert await page.locator("#password").count() == 0
    await page.locator('input[type="submit"],button[type="submit"]').click()
    return await backend.mail_link(email)


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_account_registration_and_recovery(
    harness, engine_admin, viewport
):
    """Actual SPA actions, issuer forms, confirmation SMTP and recovery revocation."""
    from urllib.parse import urlencode

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            original = await browser.new_context(viewport=viewport)
            recovering = await browser.new_context(viewport=viewport)
            repeated = await browser.new_context(viewport=viewport)
            page, recovery, repeat = (
                await original.new_page(),
                await recovering.new_page(),
                await repeated.new_page(),
            )
            email = uuid4().hex + "@example.org"
            password, changed = (secrets.token_urlsafe(24) for _ in range(2))
            destination = "/painel?apagadas=1#serie"
            confirmation, message = await start_public_registration(
                page, email, destination
            )
            async with engine_admin.connect() as conn:
                count = await conn.scalar(
                    text("SELECT count(*) FROM usuarios WHERE email=:email"),
                    {"email": email},
                )
                assert count == 0, "Unconfirmed signup must not provision an API user"
            await page.goto(confirmation)
            await page.locator("#password-new").fill(password)
            await page.locator("#password-confirm").fill(password)
            await page.locator('input[type="submit"],button[type="submit"]').click()
            await page.wait_for_url(backend.FRONT + destination)
            await expect(
                page.get_by_role("heading", name="Painel", exact=True)
            ).to_be_visible()
            first = await browser_request(page, "/auth/session")
            assert first["status"] == 200
            person = first["data"]["usuario_id"]
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM usuarios WHERE email=:email"),
                        {"email": email},
                    )
                    == 1
                )
            # An already consumed email action cannot create another API session.
            await repeat.goto(confirmation)
            await repeat.goto(backend.FRONT + "/confirmar-email")
            await expect(
                repeat.get_by_role("button", name="Continuar confirmação")
            ).to_be_enabled()
            assert (await browser_request(repeat, "/auth/session"))["status"] == 401
            # An interrupted recovery changes neither password nor existing local session.
            recover_url = (
                backend.FRONT + "/esqueci-senha?" + urlencode({"destino": destination})
            )
            await recovery.goto(recover_url)
            await recovery.get_by_role(
                "button", name="Continuar para recuperar senha"
            ).click()
            await recovery.get_by_role(
                "link", name="Forgot Password?", exact=True
            ).click()
            await recovery.goto(recover_url)
            assert (await browser_request(page, "/auth/session"))["status"] == 200
            await recovery.get_by_role(
                "button", name="Continuar para recuperar senha"
            ).click()
            await recovery.get_by_role(
                "link", name="Forgot Password?", exact=True
            ).click()
            await recovery.locator("#username").fill(email)
            await recovery.locator('input[type="submit"],button[type="submit"]').click()
            reset, _ = await backend.mail_link(email, {message})
            await recovery.goto(reset)
            await recovery.locator("#password-new").fill(changed)
            await recovery.locator("#password-confirm").fill(changed)
            await recovery.locator('input[type="submit"],button[type="submit"]').click()
            await recovery.wait_for_url(backend.FRONT + destination)
            await expect(
                recovery.get_by_role("heading", name="Painel", exact=True)
            ).to_be_visible()
            recovered = await browser_request(recovery, "/auth/session")
            assert recovered["status"] == 200
            assert recovered["data"]["usuario_id"] == person
            assert (await browser_request(page, "/auth/session"))["status"] == 401
            await page.goto(backend.FRONT + "/painel")
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            for current in (page, recovery, repeat):
                assert await current.evaluate("Object.keys(sessionStorage).length") == 0
                assert await current.evaluate("Object.keys(localStorage).length") == 0
                assert not await current.evaluate("document.cookie")
                assert not {"code", "state", "key", "token"}.intersection(
                    dict(parse_qsl(urlsplit(current.url).query))
                )
            await browser.close()
    except BrowserError:
        pytest.fail("Public account journey did not complete", pytrace=False)


@pytest.fixture
async def short_email_lifetime():
    """Only this disposable issuer; restore its setting even on a rejected action."""
    # Keycloak 26.7.4 VerifyEmail.java reads the realm's user-action lifetime.
    async with httpx.AsyncClient(timeout=15) as client:
        token = await client.post(
            "http://127.0.0.1:58080/realms/master/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": os.environ["KC_BOOTSTRAP_ADMIN_USERNAME"],
                "password": os.environ["KC_BOOTSTRAP_ADMIN_PASSWORD"],
            },
        )
        assert token.status_code == 200, "Sandbox issuer administration unavailable"
        headers = {"Authorization": "Bearer " + token.json()["access_token"]}
        endpoint = "http://127.0.0.1:58080/admin/realms/bancaemdia-acceptance"
        realm = await client.get(endpoint, headers=headers)
        assert realm.status_code == 200
        previous = realm.json()["actionTokenGeneratedByUserLifespan"]
        result = await client.put(
            endpoint, headers=headers, json={"actionTokenGeneratedByUserLifespan": 1}
        )
        assert result.status_code == 204
        try:
            yield
        finally:
            restored = await client.put(
                endpoint,
                headers=headers,
                json={"actionTokenGeneratedByUserLifespan": previous},
            )
            assert restored.status_code == 204


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_expired_confirmation(
    harness, engine_admin, short_email_lifetime, viewport
):
    """Real expired issuer mail, not a modified/synthetic token or a frozen clock."""
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            context = await browser.new_context(viewport=viewport)
            page = await context.new_page()
            email = uuid4().hex + "@example.org"
            confirmation, _ = await start_public_registration(page, email, "/painel")
            await asyncio.sleep(2)
            await page.goto(confirmation)
            if "expired" not in (await page.locator("body").inner_text()).lower():
                pytest.fail(
                    "Issuer did not reject the expired email action", pytrace=False
                )
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        text("SELECT count(*) FROM usuarios WHERE email=:email"),
                        {"email": email},
                    )
                    == 0
                )
            await page.goto(backend.FRONT + "/confirmar-email")
            await expect(
                page.get_by_role("heading", name="Confirmar e-mail", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Continuar confirmação")
            ).to_be_enabled()
            assert (await browser_request(page, "/auth/session"))["status"] == 401
            await page.get_by_text("Não conseguiu continuar?").click()
            await expect(
                page.get_by_text("Se o link expirou", exact=False)
            ).to_be_visible()
            await page.get_by_role("link", name="Recomeçar cadastro").click()
            await expect(
                page.get_by_role("heading", name="Criar conta", exact=True)
            ).to_be_visible()
            await browser.close()
    except BrowserError:
        pytest.fail("Expired account action recovery did not complete", pytrace=False)


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_commercial_access(harness, engine_admin, viewport, request):
    """Real server expiry and read-only SPA, no payment or production data."""
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        violations = []
        hosted_diagnostics = []

        def document_error(_error):
            origin = urlsplit(page.url).netloc
            if origin == urlsplit(backend.FRONT).netloc:
                violations.append("public pageerror")
            elif origin == urlsplit(backend.ISSUER).netloc:
                # Keep numeric issuer diagnostics without protocol URLs/credentials.
                hosted_diagnostics.append("hosted document pageerror")
            else:
                violations.append("unexpected document pageerror")

        page.on("pageerror", document_error)
        session, _ = await backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        uid = session["usuario_id"]
        async with engine_admin.begin() as conn:
            await conn.execute(text("SELECT billing_activate_rollout()"))
            await conn.execute(
                text(
                    "WITH bounds AS (SELECT clock_timestamp()+interval '45 seconds' AS finish) "
                    "UPDATE assinaturas SET trial_confirmed=true, trial_ends_at=bounds.finish, "
                    "trial_started_at=bounds.finish-interval '168 hours' FROM bounds WHERE usuario_id=:uid"
                ),
                {"uid": uid},
            )
        await page.goto(backend.FRONT + "/painel?casa=7&apagadas=1")
        await expect(
            page.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        current = await browser_request(page, "/auth/session")
        status = await browser_request(page, "/api/v1/billing/status")
        assert status["status"] == 200 and status["data"]["access"] == "FULL_WRITE"
        await expect(page.get_by_role("region", name="Acesso à conta")).to_have_count(0)
        created = await browser_request(
            page,
            "/api/v1/apostas",
            method="POST",
            csrf=current["data"]["csrf_token"],
            body={"casa": "betano", "odd": 2, "stake_unidades": 1},
        )
        assert created["status"] == 201
        from datetime import datetime

        expiry = datetime.fromisoformat(status["data"]["trial_ends_at"]).timestamp()
        await asyncio.sleep(max(0, expiry - time.time()) + 1)
        # The actual database clock ends access; browser dates never grant trial.
        await page.reload()
        await expect(
            page.get_by_role("heading", name="Sua conta está em modo de leitura")
        ).to_be_visible()
        await expect(
            page.get_by_role("link", name="Ver assinatura", exact=True)
        ).to_have_attribute("href", "/assinatura?casa=7&apagadas=1")
        live = (await browser_request(page, "/auth/session"))["data"]
        assert live["usuario_id"] == uid
        refused = await browser_request(
            page,
            "/api/v1/apostas",
            method="POST",
            csrf=live["csrf_token"],
            body={"casa": "betano", "odd": 2, "stake_unidades": 1},
        )
        assert (
            refused["status"] == 402
            and refused["data"]["detail"] == "account_read_only"
        )
        assert (await browser_request(page, "/api/v1/apostas"))["data"]["pagination"][
            "total"
        ] == 1
        exported = await browser_request(page, "/api/v1/usuario/me/export?formato=json")
        assert exported["status"] == 200
        calculated = await browser_request(
            page,
            "/api/v1/calculadoras/mercado-justo",
            method="POST",
            csrf=live["csrf_token"],
            body={"outcomes": [{"name": "A", "odd": "2"}, {"name": "B", "odd": "2"}]},
        )
        assert calculated["status"] == 200
        # Real UI, cookie/CSRF, issuance/expiry/redemption/revocation under READ_ONLY.
        # The private Telegram transport is represented by IncomingCommand locally;
        # no live bot, photo, external Telegram request or paid provider is used.
        from types import SimpleNamespace
        from unittest.mock import patch

        from bancaemdia.services import telegram_link as links
        from sqlalchemy.ext.asyncio import async_sessionmaker

        async def redeem(code):
            factory = async_sessionmaker(engine_admin, expire_on_commit=False)
            with patch.object(
                links,
                "get_settings",
                return_value=SimpleNamespace(
                    COLETA_TOKEN_SECRET=harness.env["COLETA_TOKEN_SECRET"]
                ),
            ):
                async with factory() as database:
                    await database.execute(
                        text("SELECT set_config('app.current_user_id', :uid, true)"),
                        {"uid": str(uid)},
                    )
                    return await links.redeem_command(
                        database,
                        links.IncomingCommand(
                            chat_type="private",
                            sender_user_id=1000000 + uid,
                            chat_id=1000000 + uid,
                            text="/vincular " + code,
                        ),
                    )

        await page.goto(backend.FRONT + "/configuracoes/conexoes?casa=7&apagadas=1")
        await expect(
            page.get_by_role("heading", name="Telegram não conectado", exact=True)
        ).to_be_visible()
        async with page.expect_response(
            lambda r: r.url.endswith("/telegram/link-codes")
        ) as pending:
            await page.get_by_role("button", name="Gerar código temporário").click()
        issued = await pending.value
        assert issued.status == 201
        first_code = (await issued.json())["code"]
        if os.environ.get("GITHUB_ACTIONS"):
            print("::add-mask::" + first_code)
        await expect(page.locator(".telegram-comando")).to_be_visible()
        async with engine_admin.begin() as database:
            await database.execute(
                text(
                    "UPDATE telegram_link_codes SET issued_at=clock_timestamp()-interval '31 minutes', "
                    "expires_at=clock_timestamp()-interval '1 second' "
                    "WHERE usuario_id=:uid AND consumed_at IS NULL"
                ),
                {"uid": uid},
            )
        accepted = await redeem(first_code)
        assert accepted is False
        await page.get_by_role("button", name="Ocultar código e parar consulta").click()
        await page.get_by_role("button", name="Preparar novo código").click()
        async with page.expect_response(
            lambda r: r.url.endswith("/telegram/link-codes")
        ) as pending:
            await page.get_by_role("button", name="Confirmar novo código").click()
        issued = await pending.value
        assert issued.status == 201
        second_code = (await issued.json())["code"]
        if os.environ.get("GITHUB_ACTIONS"):
            print("::add-mask::" + second_code)
        accepted = await redeem(second_code)
        assert accepted is True
        duplicate = await redeem(second_code)
        assert duplicate is False
        await page.get_by_role("button", name="Consultar vínculo").click()
        await expect(
            page.get_by_role("heading", name="Telegram conectado", exact=True)
        ).to_be_visible()
        await expect(page.locator(".telegram-comando")).to_have_count(0)
        fresh = (await browser_request(page, "/auth/session"))["data"]
        extra = await browser_request(
            page,
            "/api/v1/telegram/link-codes",
            method="POST",
            csrf=fresh["csrf_token"],
        )
        assert extra["status"] == 201
        pending_code = extra["data"]["code"]
        if os.environ.get("GITHUB_ACTIONS"):
            print("::add-mask::" + pending_code)
        await page.get_by_role("button", name="Revogar vínculo", exact=True).click()
        async with page.expect_response(
            lambda r: r.url.endswith("/telegram/link") and r.request.method == "DELETE"
        ) as pending:
            await page.get_by_role("button", name="Confirmar revogação").click()
        revoked = await pending.value
        assert revoked.status == 200
        assert (await revoked.json())["revoked"] is True
        await expect(
            page.get_by_role("heading", name="Telegram não conectado", exact=True)
        ).to_be_visible()
        accepted = await redeem(pending_code)
        assert accepted is False
        assert (await browser_request(page, "/api/v1/apostas"))["data"]["pagination"][
            "total"
        ] == 1
        await expect(
            page.get_by_role("link", name="Importar histórico em Enviar")
        ).to_have_attribute("href", "/enviar?casa=7&apagadas=1")
        # Simulate the sandbox provider's confirmed paid period; never a live checkout.
        async with engine_admin.begin() as conn:
            price = await conn.scalar(
                text(
                    "INSERT INTO billing_prices(amount_cents,currency,frequency,valid_from,published) "
                    "VALUES (12345,'BRL','MONTHLY',clock_timestamp(),false) RETURNING id"
                )
            )
            await conn.execute(
                text(
                    "UPDATE assinaturas SET status='ACTIVE', price_id=:price, "
                    "current_period_started_at=clock_timestamp()-interval '1 minute', "
                    "current_period_ends_at=clock_timestamp()+interval '1 hour' WHERE usuario_id=:uid"
                ),
                {"uid": uid, "price": price},
            )
        await page.get_by_role("button", name="Conferir acesso", exact=True).click()
        await expect(page.get_by_role("region", name="Acesso à conta")).to_have_count(0)
        assert (await browser_request(page, "/api/v1/billing/status"))["data"][
            "access"
        ] == "FULL_WRITE"
        # Revalidation does not replay the previously denied intent.
        assert (await browser_request(page, "/api/v1/apostas"))["data"]["pagination"][
            "total"
        ] == 1
        assert all(
            cookie["httpOnly"] for cookie in await context.cookies(backend.FRONT)
        )
        assert not await page.evaluate(
            "Boolean(document.cookie) || Object.keys(localStorage).length > 0"
        )
        request.node.user_properties.append(
            ("hosted_document_pageerrors", str(len(hosted_diagnostics)))
        )
        assert not violations
        await browser.close()


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_timezone_preference(harness, engine_admin, viewport):
    """Actual preference PATCH/GET, cookie/CSRF, persistence and tenant isolation."""
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
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
        async with engine_admin.begin() as conn:
            await conn.execute(text("SELECT billing_activate_rollout()"))
            await conn.execute(
                text(
                    "WITH bounds AS (SELECT clock_timestamp()+interval '60 seconds' AS finish) "
                    "UPDATE assinaturas SET trial_confirmed=true, trial_ends_at=bounds.finish, "
                    "trial_started_at=bounds.finish-interval '168 hours' FROM bounds WHERE usuario_id=:uid"
                ),
                {"uid": uid},
            )
        access = await browser_request(page, "/api/v1/billing/status")
        assert access["status"] == 200 and access["data"]["access"] == "FULL_WRITE"
        expiry = datetime.fromisoformat(access["data"]["trial_ends_at"]).timestamp()
        await page.goto(backend.FRONT + "/configuracoes?casa=7&apagadas=1")
        await expect(
            page.get_by_role("heading", name="Configurações", exact=True)
        ).to_be_visible()
        picker = page.get_by_label("Fuso das análises", exact=True)
        await expect(picker).to_be_enabled()
        await picker.click()
        await page.get_by_label("Buscar cidade ou região").fill("UTC")
        await page.get_by_role("button", name="UTC", exact=True).click()
        async with page.expect_response(
            lambda r: (
                r.url.endswith("/painel/preferencias") and r.request.method == "PATCH"
            )
        ) as pending:
            await page.get_by_role("button", name="Salvar fuso", exact=True).click()
        result = await pending.value
        assert result.status == 200 and (await result.json()) == {"fuso_horario": "UTC"}
        assert "no-store" in result.headers["cache-control"]
        assert "x-csrf-token" in result.request.headers
        assert "authorization" not in result.request.headers
        await expect(page.get_by_text("Fuso salvo: UTC.", exact=False)).to_be_visible()
        await page.reload()
        await expect(picker).to_contain_text("UTC")
        current = (await browser_request(page, "/auth/session"))["data"]
        invalid = await browser_request(
            page,
            "/api/v1/painel/preferencias",
            method="PATCH",
            csrf=current["csrf_token"],
            body={"fuso_horario": "America/Inventada"},
        )
        assert invalid["status"] == 422
        no_csrf = await browser_request(
            page,
            "/api/v1/painel/preferencias",
            method="PATCH",
            body={"fuso_horario": "UTC"},
        )
        assert no_csrf["status"] == 403
        await backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        other_fuso = await browser_request(other, "/api/v1/painel/preferencias")
        assert other_fuso["status"] == 200 and other_fuso["data"] == {
            "fuso_horario": "America/Sao_Paulo"
        }
        assert (await browser_request(page, "/api/v1/painel/preferencias"))["data"] == {
            "fuso_horario": "UTC"
        }
        # Trial grants are immutable; the real server clock ends this grant.
        await asyncio.sleep(max(0, expiry - time.time()) + 1)
        await page.reload()
        await expect(
            page.get_by_role("heading", name="Sua conta está em modo de leitura")
        ).to_be_visible()
        await expect(picker).to_be_disabled()
        await expect(
            page.get_by_role("button", name="Salvar fuso", exact=True)
        ).to_be_disabled()
        assert (await browser_request(page, "/api/v1/painel/preferencias"))[
            "status"
        ] == 200
        live = (await browser_request(page, "/auth/session"))["data"]
        assert live["usuario_id"] == uid
        refused = await browser_request(
            page,
            "/api/v1/painel/preferencias",
            method="PATCH",
            csrf=live["csrf_token"],
            body={"fuso_horario": "America/Manaus"},
        )
        assert (
            refused["status"] == 402
            and refused["data"]["detail"] == "account_read_only"
        )
        await expect(
            page.get_by_role("link", name="Conexões", exact=True)
        ).to_have_attribute("href", "/configuracoes/conexoes?casa=7&apagadas=1")
        await context.close()
        await other_context.close()
        await browser.close()


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_operational_bets(harness, engine_admin, viewport):
    """Public SPA against the single #187 tree: real text/context/null/page/read-only."""
    from bancaemdia import models
    from sqlalchemy import insert, update

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        contexts = [await browser.new_context(viewport=viewport) for _ in range(2)]
        page, other = [await context.new_page() for context in contexts]
        violations = []
        page.on(
            "pageerror",
            lambda _: (
                violations.append("SPA error")
                if urlsplit(page.url).netloc == urlsplit(backend.FRONT).netloc
                else None
            ),
        )
        await page.add_init_script(
            "document.addEventListener('securitypolicyviolation', () => {window.__betCspFailure=true;});"
        )
        session, _ = await backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        uid = session["usuario_id"]

        async def write(path, body=None, method="POST"):
            live = (await browser_request(page, "/auth/session"))["data"]
            return await browser_request(
                page, path, method=method, csrf=live["csrf_token"], body=body
            )

        first = await write(
            "/api/v1/apostas",
            {
                "casa": "betano",
                "odd": 2,
                "stake_unidades": 1,
                "evento": "Evento sem conta",
                "descricao": None,
                "data_jogo": None,
            },
        )
        assert first["status"] == 201
        titular = await write("/api/v1/titulares", {"nome": "Titular da aposta"})
        assert titular["status"] == 201
        tid = titular["data"]["id"]
        conta = await write(
            f"/api/v1/titulares/{tid}/contas",
            {"casa_id": first["data"]["casa_id"], "apelido": "Conta registrada"},
        )
        assert conta["status"] == 201
        cid = conta["data"]["conta_casa_id"]
        assert (await write(f"/api/v1/titulares/{tid}/contas/{cid}/ativar"))[
            "status"
        ] == 200
        second = await write(
            "/api/v1/apostas",
            {
                "casa": "betano",
                "odd": 2,
                "stake_unidades": 1,
                "evento": "Evento com conta",
                "descricao": "Descrição anterior",
                "mercado_bruto": "Mercado registrado",
                "conta_casa_ref": cid,
                "data_jogo": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
            },
        )
        assert second["status"] == 201
        third = await write(
            "/api/v1/apostas",
            {
                "casa": "betano",
                "odd": 2,
                "stake_unidades": 1,
                "freebet": True,
                "evento": "Freebet da lista",
                "data_jogo": None,
            },
        )
        assert third["status"] == 201
        assert (
            await write(
                "/api/v1/apostas/" + third["data"]["aposta"]["chave"], method="DELETE"
            )
        )["status"] == 200
        key = second["data"]["aposta"]["chave"]
        bank_id = 9007199254740995
        # Disposable historical references/labels; no monetary result is seeded or calculated.
        async with engine_admin.begin() as conn:
            await conn.execute(
                insert(models.Banca).values(
                    id=bank_id, usuario_id=uid, nome="Banca histórica registrada"
                )
            )
            current_bank = await conn.scalar(
                insert(models.Banca)
                .values(usuario_id=uid, nome="Outra banca atual da conta")
                .returning(models.Banca.id)
            )
            await conn.execute(
                update(models.Aposta)
                .where(models.Aposta.chave == key, models.Aposta.usuario_id == uid)
                .values(banca_id=bank_id)
            )
            await conn.execute(
                update(models.ContaCasa)
                .where(models.ContaCasa.id == cid, models.ContaCasa.usuario_id == uid)
                .values(
                    ativa=False,
                    apelido="Conta histórica renomeada",
                    banca_id=current_bank,
                )
            )
            await conn.execute(
                update(models.Titular)
                .where(models.Titular.id == tid, models.Titular.usuario_id == uid)
                .values(nome="Titular renomeado", arquivado=True)
            )
        reads = []
        page.on(
            "request",
            lambda req: (
                reads.append(urlsplit(req.url).path)
                if req.method == "GET" and "/api/v1/apostas" in req.url
                else None
            ),
        )
        query = "/?page_size=1&apagadas=todas"
        await page.goto(backend.FRONT + query)
        await expect(
            page.get_by_role("heading", name="Apostas", exact=True)
        ).to_be_visible()
        for count in (2, 3):
            await page.get_by_role("button", name="Mostrar mais", exact=True).click()
            await expect(page.get_by_role("article")).to_have_count(count)
        await expect(
            page.get_by_role("heading", name="Evento com conta", exact=True)
        ).to_be_visible()
        await expect(
            page.get_by_text("Freebet — valor de face", exact=True)
        ).to_be_visible()
        await expect(
            page.get_by_text("Apagada — fora da apuração", exact=True)
        ).to_be_visible()
        await expect(
            page.get_by_role("button", name="Mostrar mais", exact=True)
        ).to_be_disabled()
        article = page.get_by_role("article", name="Evento com conta", exact=True)
        await article.get_by_text("Informações da aposta", exact=True).click()
        await expect(
            article.get_by_text("Conta histórica renomeada (inativa)", exact=True)
        ).to_be_visible()
        await expect(
            article.get_by_text("Titular renomeado (arquivado)", exact=True)
        ).to_be_visible()
        await expect(
            article.get_by_text("Banca histórica registrada", exact=True)
        ).to_be_visible()
        await expect(article.get_by_text(str(bank_id), exact=True)).to_be_visible()
        await expect(
            page.get_by_text("Outra banca atual da conta", exact=True)
        ).to_have_count(0)
        live_page = await browser_request(
            page, "/api/v1/apostas?incluir_apagadas=true&page_size=10"
        )
        assert (
            live_page["status"] == 200 and live_page["data"]["pagination"]["total"] == 3
        )
        actual = next(row for row in live_page["data"]["data"] if row["chave"] == key)
        assert actual["conta_contexto"]["id"] == str(cid)
        assert actual["banca_contexto"]["id"] == str(bank_id)
        assert any(row["descricao"] is None for row in live_page["data"]["data"])
        assert (
            await write(
                "/api/v1/apostas/" + key,
                {"evento": "Evento corrigido", "descricao": "Texto corrigido pela API"},
                "PATCH",
            )
        )["status"] == 200
        await page.get_by_role("button", name="Atualizar visão", exact=True).click()
        await expect(
            page.get_by_role("heading", name="Evento corrigido", exact=True)
        ).to_be_visible()
        await expect(page.get_by_role("article")).to_have_count(3)
        await expect(
            page.get_by_text("Texto corrigido pela API", exact=True)
        ).to_be_visible()
        assert all(path == "/api/v1/apostas" for path in reads)
        assert not await page.evaluate("window.__betCspFailure === true")
        async with engine_admin.begin() as conn:
            await conn.execute(text("SELECT billing_activate_rollout()"))
        await page.reload()
        await expect(
            page.get_by_role(
                "heading", name="Sua conta está em modo de leitura", exact=True
            )
        ).to_be_visible()
        await expect(
            page.get_by_role("link", name="Conectar Telegram", exact=True)
        ).to_have_attribute(
            "href", "/configuracoes/conexoes?page_size=1&apagadas=todas"
        )
        assert (await browser_request(page, "/api/v1/apostas"))["status"] == 200
        assert not await page.evaluate("window.__betCspFailure === true")
        await backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        await other.goto(backend.FRONT + query)
        await expect(
            other.get_by_role("heading", name="Nenhuma aposta nesta visão", exact=True)
        ).to_be_visible()
        await expect(other.get_by_text("Titular renomeado", exact=False)).to_have_count(
            0
        )
        await page.goto(backend.FRONT + "/sair")
        await page.get_by_role("button", name="Confirmar saída", exact=True).click()
        await expect(
            page.get_by_role("heading", name="Entrar", exact=True)
        ).to_be_visible()
        assert (await browser_request(page, "/api/v1/apostas"))["status"] == 401
        assert not await page.evaluate("window.__betCspFailure === true")
        assert not await page.evaluate("document.cookie")
        assert (
            await page.evaluate(
                "Object.keys(localStorage).length + Object.keys(sessionStorage).length"
            )
            == 0
        )
        assert not violations
        await browser.close()


@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_authenticated_bet_filters(harness_filtros, engine_admin, viewport):
    """Separate #184 tree: actual list/summary/catalogs/deleted/exact IDs and isolation."""
    from bancaemdia import models
    from sqlalchemy import insert, update

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        contexts = [await browser.new_context(viewport=viewport) for _ in range(2)]
        page, other = [await context.new_page() for context in contexts]
        session, _ = await backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness_filtros,
        )
        uid = session["usuario_id"]
        created = await browser_request(
            page,
            "/api/v1/apostas",
            method="POST",
            csrf=session["csrf_token"],
            body={
                "casa": "betano",
                "odd": 2,
                "stake_unidades": 1,
                "data_aposta": "2026-10-06T15:00:00Z",
            },
        )
        assert created["status"] == 201
        key = created["data"]["aposta"]["chave"]
        historic_id = 9007199254740993
        async with engine_admin.begin() as conn:
            await conn.execute(
                insert(models.GrupoAposta).values(
                    id=historic_id,
                    usuario_id=uid,
                    nome="Grupo histórico exato",
                    arquivado=True,
                )
            )
            await conn.execute(
                insert(models.Banca).values(
                    id=historic_id, usuario_id=uid, nome="Banca da população"
                )
            )
            aposta_id = await conn.scalar(
                text("SELECT id FROM apostas WHERE chave=:key AND usuario_id=:uid"),
                {"key": key, "uid": uid},
            )
            await conn.execute(
                insert(models.ApostaGrupo).values(
                    usuario_id=uid, aposta_id=aposta_id, grupo_id=historic_id
                )
            )
            await conn.execute(
                update(models.Aposta)
                .where(models.Aposta.id == aposta_id, models.Aposta.usuario_id == uid)
                .values(banca_id=historic_id)
            )
        deleted = await browser_request(
            page, "/api/v1/apostas/" + key, method="DELETE", csrf=session["csrf_token"]
        )
        assert deleted["status"] == 200
        async with engine_admin.begin() as conn:
            await conn.execute(text("SELECT billing_activate_rollout()"))
        query = "?grupo=9007199254740993&banca=9007199254740993&apagadas=1&estado=PENDENTE&origem=manual&desde=2026-10-06&ate=2026-10-06&page_size=1"
        reads = []
        violations = []
        page.on(
            "request",
            lambda req: (
                reads.append(req.url)
                if req.method == "GET" and "/api/v1/" in req.url
                else None
            ),
        )
        page.on(
            "pageerror",
            lambda _: (
                violations.append("SPA error")
                if urlsplit(page.url).netloc == urlsplit(backend.FRONT).netloc
                else None
            ),
        )
        await page.add_init_script(
            "document.addEventListener('securitypolicyviolation', () => {window.__filtersCspFailure=true;});"
        )
        await page.goto(backend.FRONT + "/" + query)
        await expect(page.get_by_role("article")).to_have_count(1)
        await expect(
            page.get_by_role(
                "heading", name="Sua conta está em modo de leitura", exact=True
            )
        ).to_be_visible()
        await expect(
            page.get_by_text("Apagada — fora da apuração", exact=True)
        ).to_be_visible()
        await page.get_by_text(
            "Filtrar apostas — há filtros ativos", exact=True
        ).click()
        await expect(
            page.get_by_role(
                "button", name="Grupo Grupo histórico exato (inativa)", exact=True
            )
        ).to_be_visible()
        await expect(
            page.get_by_role("button", name="Banca Banca da população", exact=True)
        ).to_be_visible()
        summary_box = page.get_by_role("region", name="Resumo desta visão", exact=True)
        await expect(
            summary_box.locator("dt")
            .filter(has_text=re.compile("^Apostas$"))
            .locator("..")
            .locator("dd")
        ).to_have_text("1")
        assert len({urlsplit(url).path for url in reads if "/filtros/" in url}) == 9
        list_url = next(url for url in reads if urlsplit(url).path == "/api/v1/apostas")
        summary_url = next(
            url for url in reads if urlsplit(url).path == "/api/v1/painel/filtrado"
        )
        selection = dict(parse_qsl(urlsplit(list_url).query))
        common = {k: v for k, v in selection.items() if k not in {"page", "page_size"}}
        assert common == dict(parse_qsl(urlsplit(summary_url).query))
        assert common["grupo_id"] == common["banca_id"] == str(historic_id)
        assert common["visibilidade"] == "apagadas" and "incluir_apagadas" not in common
        listed = (
            await browser_request(
                page, urlsplit(list_url).path + "?" + urlsplit(list_url).query
            )
        )["data"]
        summary = (
            await browser_request(
                page, urlsplit(summary_url).path + "?" + urlsplit(summary_url).query
            )
        )["data"]
        assert listed["pagination"]["total"] == summary["resumo"]["total_apostas"] == 1
        assert listed["data"][0]["chave"] == key
        await page.goto(backend.FRONT + "/" + query + "&page=2")
        await expect(
            page.get_by_role("heading", name="Esta página não tem apostas", exact=True)
        ).to_be_visible()
        await page.get_by_role(
            "link", name="Voltar à primeira página", exact=True
        ).click()
        await expect(page.get_by_role("article")).to_have_count(1)
        await page.get_by_text(
            "Filtrar apostas — há filtros ativos", exact=True
        ).click()
        await page.get_by_role(
            "button", name="Remover filtro Visibilidade", exact=True
        ).click()
        await expect(
            page.get_by_role("heading", name="Nenhuma aposta nesta visão", exact=True)
        ).to_be_visible()
        await expect(
            summary_box.locator("dt")
            .filter(has_text=re.compile("^Apostas$"))
            .locator("..")
            .locator("dd")
        ).to_have_text("0")
        assert "apagadas=" not in page.url
        await backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness_filtros,
        )
        await other.goto(backend.FRONT + "/" + query)
        await expect(
            other.get_by_role("heading", name="Nenhuma aposta nesta visão", exact=True)
        ).to_be_visible()
        await other.get_by_text(
            "Filtrar apostas — há filtros ativos", exact=True
        ).click()
        await expect(
            other.get_by_role("button", name="Remover filtro Grupo", exact=True)
        ).to_contain_text("nome indisponível")
        await expect(
            other.get_by_text("Grupo histórico exato", exact=False)
        ).to_have_count(0)
        assert all(
            urlsplit(url).path == "/api/v1/apostas"
            for url in reads
            if "/apostas" in url
        )
        assert not await page.evaluate("window.__filtersCspFailure === true")
        assert not await page.evaluate("document.cookie")
        assert (
            await page.evaluate(
                "Object.keys(localStorage).length + Object.keys(sessionStorage).length"
            )
            == 0
        )
        assert not violations
        await browser.close()
