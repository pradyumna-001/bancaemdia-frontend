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
    harness, engine_admin, engine_app, como, profile
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
