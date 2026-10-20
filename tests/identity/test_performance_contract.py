"""Cold public-build performance with real OIDC/session/API and large synthetic facts."""

import asyncio
import importlib.util
import json
import os
import secrets
import signal
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import httpx
import pytest
from playwright.async_api import async_playwright


def load(name, filename):
    spec = importlib.util.spec_from_file_location(
        name, Path(__file__).with_name(filename)
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


core = load("frontend_performance_core", "test_core_contract.py")
seed = load("frontend_performance_seed", "performance_seed.py")
banco = core.banco
harness = core.harness
ROOT = Path(__file__).resolve().parents[2]


def spawn_owned_tls(harness, public, private):
    process = subprocess.Popen(
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
    return process


@pytest.fixture
async def performance_transport(harness, tmp_path):
    # Coleta intentionally refuses plain HTTP. Reuse its real TLS proof rather
    # than trusting invented forwarding headers or weakening the API requirement.
    collection = load("frontend_performance_collection", "test_coleta_contract.py")
    public, private = collection.tls_files(tmp_path)
    upstream = "https://127.0.0.1:58443"
    creating = asyncio.create_task(
        asyncio.to_thread(spawn_owned_tls, harness, public, private)
    )
    try:
        process = await asyncio.shield(creating)
    except asyncio.CancelledError:
        # Finish registration before the enclosing runtime cleans its processes.
        await creating
        raise
    try:
        async with httpx.AsyncClient(
            base_url=upstream, verify=str(public), timeout=15
        ) as client:
            for _ in range(100):
                assert process.poll() is None, (
                    "Owned performance TLS API failed to start"
                )
                try:
                    if (
                        await client.get("/api/v1/coleta/installations")
                    ).status_code == 401:
                        break
                except httpx.ConnectError:
                    pass
                await asyncio.sleep(0.1)
            else:
                raise AssertionError("Owned performance TLS API unavailable")
        harness.frontend_proxy.collection_tls = (upstream, str(public))
        yield
    finally:
        harness.frontend_proxy.collection_tls = None
        if process.poll() is None:
            process.terminate()
            try:
                await asyncio.to_thread(process.wait, 15)
            except subprocess.TimeoutExpired:
                process.kill()
                await asyncio.to_thread(process.wait, 15)


def resolved_routes(initial):
    routes = json.loads(
        (ROOT / "config/performance-routes.json").read_text(encoding="utf-8")
    )
    resolved = []
    for route in routes:
        path = route["path"].replace(":chave", quote(initial["keys"][0], safe=""))
        path = path.replace(":titularId", str(initial["holders"][0]))
        heading = {
            "/e-se": "E se eu seguisse a stake do tipster?",
            "/configuracoes/conexoes": "Telegram",
            "/aposta/:chave": "Jornada central 0",
            "/contas/:titularId": "Titular central A",
        }.get(route["path"], route["title"])
        if route["path"] == "/":
            path += "?periodo=all&page_size=100"
        elif route["path"] in {"/painel", "/painel/analises", "/banca", "/e-se"}:
            path += "?periodo=all"
        resolved.append({"id": route["id"], "path": path, "heading": heading})
    return resolved


async def run_measurement(payload, profile, output):
    kwargs = {"start_new_session": True} if os.name != "nt" else {}
    process = await asyncio.create_subprocess_exec(
        "node",
        str(ROOT / "scripts/measure-performance.mjs"),
        profile,
        str(output),
        cwd=ROOT,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        **kwargs,
    )
    try:
        # Cookie/paths are never command arguments, environment, files or logs.
        await asyncio.wait_for(
            process.communicate(json.dumps(payload).encode()), timeout=2100
        )
    except (TimeoutError, asyncio.CancelledError):
        if process.returncode is None:
            if os.name == "nt":
                process.terminate()
            else:
                os.killpg(process.pid, signal.SIGTERM)
            try:
                await asyncio.wait_for(process.wait(), timeout=15)
            except TimeoutError:
                if os.name == "nt":
                    process.kill()
                else:
                    os.killpg(process.pid, signal.SIGKILL)
                await process.wait()
        raise
    return process.returncode


@pytest.mark.parametrize("profile", ["mobile", "desktop"])
async def test_public_spa_cold_performance(
    harness, performance_transport, engine_admin, engine_app, como, profile
):
    pin = json.loads((ROOT / "config/api-contract.json").read_text(encoding="utf-8"))
    actual_api = (
        await asyncio.to_thread(
            subprocess.check_output, ["git", "rev-parse", "HEAD"], text=True
        )
    ).strip()
    assert actual_api == pin["commit"], "Performance API version mismatch"
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        context = await browser.new_context()
        try:
            page = await context.new_page()
            session, _ = await core.backend.register(
                page,
                uuid4().hex + "@example.org",
                secrets.token_urlsafe(24),
                harness=harness,
            )
            uid = session["usuario_id"]
            await core.grant(page, engine_admin, uid, seconds=7200)
            initial, dataset = await seed.seed_large(
                core, page, engine_admin, engine_app, como, uid
            )
            await core.fresh_session(page)
            output = (
                Path(os.environ["PERFORMANCE_REPORT_DIR"])
                / f"performance-{profile}.json"
            )
            code = await run_measurement(
                {
                    "origin": core.backend.FRONT,
                    "apiSha": actual_api,
                    "cookies": await context.cookies(core.backend.FRONT),
                    "dataset": dataset,
                    "routes": resolved_routes(initial),
                },
                profile,
                output,
            )
            if code:
                pytest.fail(
                    "Public-build performance failed; inspect the allowlisted measurement report",
                    pytrace=False,
                )
        finally:
            await context.close()
            await browser.close()
