"""Real cookie contract from the public SPA; no session override enters its bundle.

Run with the pinned backend as cwd, after building the frontend. Its sandbox fixtures
own disposable PostgreSQL/OIDC/SMTP. This server stands in for the same-origin proxy.
"""

import json
import mimetypes
import re
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
import pytest
from playwright.async_api import async_playwright, expect

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
            page.on("pageerror", lambda _error: violations.append("pageerror"))
            await page.add_init_script("""document.addEventListener('securitypolicyviolation',
              () => { document.documentElement.dataset.cspFailure='true'; });""")
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
        logout = await browser_request(
            pages[0], "/auth/logout", method="POST", csrf=live["csrf_token"]
        )
        assert logout["status"] == 200 and logout["data"]["logged_out"] is True
        assert (await browser_request(pages[0], "/auth/session"))["status"] == 401
        assert (await browser_request(pages[0], "/api/v1/apostas"))["status"] == 401
        assert (await browser_request(pages[1], "/auth/session"))["status"] == 200
        assert "no-store" in logout["headers"]["cache-control"]
        for context, page in zip(contexts, pages):
            assert not await page.locator("html").get_attribute("data-csp-failure")
            assert all(c["httpOnly"] for c in await context.cookies(backend.FRONT))
            # Public guard is still provisional: this proof never enables #11 in the bundle.
            await page.goto(backend.FRONT + "/painel")
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
        assert not violations
        await browser.close()
