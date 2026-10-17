"""Public SPA and real owner/extension contracts; independent TLS API listener."""

import asyncio
import importlib.util
import ipaddress
import os
import secrets
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from playwright.async_api import async_playwright, expect

_spec = importlib.util.spec_from_file_location(
    "frontend_collection_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness


def private_assert(condition):
    if not condition:
        raise AssertionError("Private collection assertion failed; values omitted")


def tls_files(folder):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name(
        [x509.NameAttribute(NameOID.COMMON_NAME, "Disposable collection API")]
    )
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(UTC) - timedelta(minutes=1))
        .not_valid_after(datetime.now(UTC) + timedelta(hours=1))
        .add_extension(
            x509.SubjectAlternativeName(
                [x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]
            ),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )
    public, private = folder / "collection.pem", folder / "collection-key.pem"
    public.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    private.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    return public, private


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_coleta_owner_devices(
    harness, engine_admin, tmp_path, viewport, browser_name
):
    await harness.restart()
    public, private = tls_files(tmp_path)
    upstream = "https://127.0.0.1:58443"
    process = await asyncio.to_thread(
        subprocess.Popen,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "bancaemdia.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "58443",
            "--ssl-certfile",
            str(public),
            "--ssl-keyfile",
            str(private),
            "--no-access-log",
        ],
        cwd=harness.root,
        env=harness.env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    harness.processes.append(process)
    harness.frontend_proxy.collection_tls = (upstream, str(public))
    trace = (
        Path(os.environ["CORE_TRACE_DIR"])
        / f"coleta-{browser_name}-{viewport['width']}.zip"
    )
    try:
        async with httpx.AsyncClient(
            base_url=upstream, verify=str(public), timeout=15
        ) as extension:
            for _ in range(100):
                assert process.poll() is None, "Owned TLS API failed to start"
                try:
                    if (
                        await extension.get("/api/v1/coleta/installations")
                    ).status_code == 401:
                        break
                except httpx.ConnectError:
                    pass
                await asyncio.sleep(0.1)
            else:
                raise AssertionError("Owned TLS API unavailable")
            async with async_playwright() as playwright:
                browser = await getattr(playwright, browser_name).launch()
                contexts = [
                    await browser.new_context(viewport=viewport) for _ in range(2)
                ]
                pages = [await context.new_page() for context in contexts]
                users = []
                for page in pages:
                    session, _ = await core.backend.register(
                        page,
                        uuid4().hex + "@example.org",
                        secrets.token_urlsafe(24),
                        harness=harness,
                    )
                    users.append(session["usuario_id"])
                expiry = await core.grant(pages[0], engine_admin, users[0], seconds=45)
                page = pages[0]
                await page.goto(core.backend.FRONT + "/coleta?casa=7&apagadas=1")
                await expect(
                    page.get_by_role("heading", name="Nenhum dispositivo conectado")
                ).to_be_visible()
                assert (
                    await core.request(
                        page, "/api/v1/coleta/pairing-codes", method="POST"
                    )
                )["status"] == 403

                async def issue():
                    await page.get_by_role(
                        "button", name="Gerar código de conexão"
                    ).click()
                    await expect(
                        page.get_by_role("heading", name="Seu código de conexão")
                    ).to_be_focused()
                    code = await page.locator(".coleta-codigo").inner_text()
                    if os.environ.get("GITHUB_ACTIONS"):
                        print("::add-mask::" + code)
                    private_assert(code not in page.url)
                    storage = await page.evaluate(
                        "JSON.stringify({...localStorage,...sessionStorage})"
                    )
                    private_assert(code not in storage)
                    await page.get_by_role("button", name="Ocultar e concluir").click()
                    return code

                async def pair(code, public_id, name):
                    result = await extension.post(
                        "/api/v1/coleta/pairing-exchange",
                        json={
                            "codigo": code,
                            "instalacao_publica_id": public_id,
                            "nome_dispositivo": name,
                        },
                    )
                    assert result.status_code == 200, "Real exchange refused"
                    data = result.json()
                    if os.environ.get("GITHUB_ACTIONS"):
                        print("::add-mask::" + data["token"])
                    return data

                ids = [str(uuid4()), str(uuid4())]
                first = await pair(await issue(), ids[0], "Notebook coleta A")
                second = await pair(await issue(), ids[1], "Notebook coleta B")
                await page.get_by_role("button", name="Consultar dispositivos").click()
                await expect(
                    page.get_by_role("article", name="Notebook coleta A")
                ).to_contain_text("Sem sessão registrada")
                await expect(
                    page.get_by_role("article", name="Notebook coleta B")
                ).to_contain_text("Sem sessão registrada")
                boundary = "2026-08-01T00:00:00.123456Z"
                opened = await extension.post(
                    "/api/v1/coleta/sessions",
                    headers={"X-Coleta-Token": first["token"]},
                    json={"coletar_desde": boundary},
                )
                assert opened.status_code == 200
                session_id = opened.json()["sessao_id"]
                closed = await extension.post(
                    "/api/v1/coleta/sessions",
                    headers={"X-Coleta-Token": second["token"]},
                    json={"coletar_desde": boundary},
                )
                assert closed.status_code == 200
                assert (
                    await extension.delete(
                        "/api/v1/coleta/sessions/" + closed.json()["sessao_id"],
                        headers={"X-Coleta-Token": second["token"]},
                    )
                ).status_code == 204
                # Re-pair the same public installation and resume its real session.
                first = await pair(await issue(), ids[0], "Notebook coleta A")
                resumed = await extension.post(
                    "/api/v1/coleta/sessions",
                    headers={"X-Coleta-Token": first["token"]},
                    json={
                        "coletar_desde": boundary,
                        "retomar_sessao_id": session_id,
                    },
                )
                assert resumed.status_code == 200
                rows = await core.read(page, "/api/v1/coleta/installations")
                assert (
                    len(rows) == 2
                    and rows[0]["sessao_coleta"]["coletar_desde"] == boundary
                )
                assert (
                    rows[0]["estado_sessao"] == "aberta"
                    and rows[1]["estado_sessao"] == "encerrada"
                )
                await page.get_by_role("button", name="Consultar dispositivos").click()
                a = page.get_by_role("article", name="Notebook coleta A")
                b = page.get_by_role("article", name="Notebook coleta B")
                await expect(a).to_contain_text("Aberta")
                await expect(b).to_contain_text("Última encerrada")
                assert await a.locator("time").get_attribute("datetime") == boundary
                private_assert(
                    first["token"] not in await page.locator("body").inner_text()
                )
                # Natural commercial expiry: management remains allowed, ingest does not.
                await asyncio.sleep(max(0, expiry - core.time.time() + 0.2))
                await core.fresh_session(page)
                await page.goto(core.backend.FRONT + "/coleta?casa=7&apagadas=1")
                assert (await core.read(page, "/api/v1/billing/status"))[
                    "access"
                ] == "READ_ONLY"
                denied = await core.request(
                    page,
                    "/api/v1/apostas",
                    method="POST",
                    csrf=(await core.read(page, "/auth/session"))["csrf_token"],
                    body={"casa": "Betano", "odd": 2, "stake_unidades": 1},
                )
                assert denied["status"] == 402
                await core.fresh_session(pages[1])
                assert (await core.read(pages[1], "/api/v1/coleta/installations")) == []
                other_session = await core.read(pages[1], "/auth/session")
                other_rotate = await core.request(
                    pages[1],
                    f"/api/v1/coleta/installations/{first['instalacao_id']}/rotate",
                    method="POST",
                    csrf=other_session["csrf_token"],
                )
                assert other_rotate["status"] == 404
                await contexts[0].tracing.start(
                    screenshots=False, snapshots=False, sources=False
                )
                try:
                    await a.get_by_role("button", name="Trocar credencial").click()
                    await expect(
                        page.get_by_role(
                            "heading", name="Trocar credencial: Notebook coleta A?"
                        )
                    ).to_be_focused()
                    await page.get_by_role("button", name="Confirmar troca").click()
                    await expect(
                        page.get_by_role(
                            "heading", name="Nova credencial do dispositivo"
                        )
                    ).to_be_visible()
                    token = await page.locator(".coleta-codigo").inner_text()
                    if os.environ.get("GITHUB_ACTIONS"):
                        print("::add-mask::" + token)
                    private_assert(token != first["token"])
                    assert (
                        await extension.get(
                            "/api/v1/coleta/status",
                            headers={"X-Coleta-Token": first["token"]},
                        )
                    ).status_code == 403
                    assert (
                        await extension.get(
                            "/api/v1/coleta/status", headers={"X-Coleta-Token": token}
                        )
                    ).status_code == 200
                    assert (
                        await extension.get(
                            "/api/v1/coleta/status",
                            headers={"X-Coleta-Token": second["token"]},
                        )
                    ).status_code == 200
                    await page.get_by_role("button", name="Ocultar e concluir").click()
                    lost = []

                    def lose(method, path, response):
                        if method == "POST" and path.endswith("/rotate"):
                            assert response.status_code == 200
                            lost.append(True)
                            return len(lost) == 1
                        return False

                    harness.frontend_proxy.after_api_response = lose
                    await a.get_by_role("button", name="Trocar credencial").click()
                    await page.get_by_role("button", name="Confirmar troca").click()
                    await expect(
                        page.get_by_text(
                            "A ação terminou sem confirmação e não será repetida",
                            exact=False,
                        )
                    ).to_be_visible()
                    assert len(lost) == 1
                    await expect(page.locator(".coleta-codigo")).to_have_count(0)
                    await page.get_by_role(
                        "button", name="Consultar dispositivos"
                    ).click()
                    await a.get_by_role("button", name="Revogar acesso").click()
                    await page.get_by_role("button", name="Confirmar revogação").click()
                    await expect(a.get_by_text("Revogada", exact=True)).to_be_visible()
                    await expect(a).to_contain_text("Aberta")
                    await expect(
                        b.get_by_role("button", name="Revogar acesso")
                    ).to_be_enabled()
                    assert (
                        await extension.get(
                            "/api/v1/coleta/status",
                            headers={"X-Coleta-Token": second["token"]},
                        )
                    ).status_code == 200
                    for theme in ("claro", "escuro"):
                        await page.evaluate(
                            "theme=>document.documentElement.setAttribute('data-tema',theme)",
                            theme,
                        )
                        await page.screenshot(
                            path=str(
                                trace.with_name(
                                    f"coleta-{browser_name}-{viewport['width']}-{theme}.png"
                                )
                            ),
                            full_page=True,
                        )
                    await page.set_viewport_size({"width": 320, "height": 844})
                    assert await page.evaluate(
                        "document.documentElement.scrollWidth <= innerWidth"
                    )
                    # Exercise the actual quota; never alter limits or server timestamps.
                    for _ in range(6):
                        async with page.expect_response(
                            lambda r: r.url.endswith("/coleta/pairing-codes")
                        ) as response:
                            await page.get_by_role(
                                "button", name="Gerar código de conexão"
                            ).click()
                        code_status = (await response.value).status
                        if code_status == 429:
                            break
                        assert code_status == 201
                        await page.get_by_role(
                            "button", name="Ocultar e concluir"
                        ).click()
                    else:
                        raise AssertionError("Real pairing quota was not reached")
                    await expect(
                        page.get_by_role("button", name="Gerar código de conexão")
                    ).to_be_disabled()
                    await page.goto(core.backend.FRONT + "/sair")
                    await page.get_by_role(
                        "button", name="Confirmar saída", exact=True
                    ).click()
                    await expect(
                        page.get_by_role("heading", name="Entrar", exact=True)
                    ).to_be_visible()
                    assert (await core.request(page, "/api/v1/coleta/installations"))[
                        "status"
                    ] == 401
                    assert "cti_" not in await page.locator("body").inner_text()
                finally:
                    await contexts[0].tracing.stop(path=trace)
                    core.sanitize_trace(trace)
                    for context in contexts:
                        await context.close()
                    await browser.close()
    finally:
        harness.frontend_proxy.collection_tls = None
        harness.frontend_proxy.after_api_response = None
        if process.poll() is None:
            process.terminate()
            await asyncio.to_thread(process.wait, 15)
