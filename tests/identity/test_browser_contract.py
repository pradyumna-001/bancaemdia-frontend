"""Real cookie contract from the public SPA; no session override enters its bundle.

Run with the pinned backend as cwd, after building the frontend. Its sandbox fixtures
own disposable PostgreSQL/OIDC/SMTP. This server stands in for the same-origin proxy.
"""

import asyncio
import json
import mimetypes
import os
import re
import secrets
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
import pytest
from playwright.async_api import async_playwright, expect
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from tests.conftest import _preparar

from tests.identity import journey as backend

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


def serve_public_build():
    security = (ROOT / "dist-security/default.conf").read_text()
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
                target = (DIST / path.lstrip("/")).resolve()
                if not target.is_relative_to(DIST.resolve()):
                    self.send_error(404)
                    return
                if path.startswith(("/assets/", "/fontes/")) and not target.is_file():
                    self.send_error(404)
                    return
                if not target.is_file():
                    target = DIST / "index.html"
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
        async with engine_admin.begin() as conn:
            result = await conn.execute(
                text(
                    "INSERT INTO revisao_pendente (usuario_id, motivo) VALUES (:id, 'sandbox')"
                ),
                {"id": sa["usuario_id"]},
            )
            assert result.rowcount == 1
        await pa.goto(backend.FRONT + "/painel?apagadas=1#serie")
        await expect(
            pa.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        await expect(
            pa.get_by_role("link", name=re.compile(r"Revisão.*1 pendências")).first
        ).to_be_visible()
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
        await backend.login(second, email_b, password_b)
        await expect(
            pa.get_by_role("link", name=re.compile(r"Revisão.*1 pendências"))
        ).to_have_count(0)
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
        await pa.locator("#username").fill(email_a)
        if not await pa.locator("#password").count():
            await pa.locator("#kc-login").click()
        await pa.locator("#password").fill(password_a)
        await pa.locator("#kc-login").click()
        await pa.wait_for_url(backend.FRONT + "/painel?apagadas=1#serie", timeout=30000)
        await expect(
            pa.get_by_role("heading", name="Painel", exact=True)
        ).to_be_visible()
        assert await pa.evaluate("Object.keys(sessionStorage).length") == 0
        assert await pa.evaluate("Object.keys(localStorage).length") == 0
        assert not await pa.evaluate("document.cookie")
        await browser.close()
