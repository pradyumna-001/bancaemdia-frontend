"""Temporal switch confirmation and durable recovery through the public SPA."""

import asyncio
import importlib.util
import os
import re
import secrets
import sys
import time
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import pytest
from bancaemdia import models
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import insert, select
from tests.integration.test_troca_titular import _setup

_spec = importlib.util.spec_from_file_location(
    "frontend_switch_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness


def private_assert(condition):
    if not condition:
        pytest.fail("Switch intention invariant failed", pytrace=False)


async def open_lookup(page, house, deleted=False):
    async with page.expect_response(
        lambda r: (
            r.request.method == "GET"
            and r.url.endswith(f"/api/v1/titulares/casas/{house}/matriz")
            and r.status in {200, 404}
        )
    ):
        await page.goto(
            core.backend.FRONT
            + f"/contas/trocar?casa={house}"
            + ("&apagadas=1" if deleted else "")
        )
    # Let real session renewal and its mandatory private-state fence settle
    # before the next explicit lookup gesture. Never retry a filled intention.
    if deleted:
        await expect(
            page.get_by_role(
                "heading", name="Sua conta está em modo de leitura", exact=True
            )
        ).to_be_visible()
    await expect(
        page.get_by_text("Consultando contas elegíveis…", exact=True)
    ).to_have_count(0)
    await expect(
        page.get_by_text("Consultando fila de revisão…", exact=True)
    ).to_have_count(0)


async def restore_code(page, key):
    try:
        await page.get_by_text("Consultar uma troca anterior", exact=True).click()
        await page.get_by_label("Código de consulta anterior").fill(key)
        await page.get_by_role("button", name="Usar código para consulta").click()
    except BrowserError:
        pytest.fail("Switch intention lookup could not be opened", pytrace=False)


async def choose(page, label, option):
    button = page.get_by_role("button", name=re.compile("^" + re.escape(label) + " "))
    await expect(button).to_be_enabled()
    await button.focus()
    await expect(button).to_be_focused()
    await page.keyboard.press("Enter")
    dialog = page.get_by_role("dialog", name=label, exact=True)
    await expect(dialog).to_be_visible()
    await dialog.get_by_role("button", name=option, exact=True).click()
    await expect(dialog).not_to_be_visible()
    await expect(button).to_be_focused()


async def prepare(page, house, instant):
    await page.goto(core.backend.FRONT + f"/contas/trocar?casa={house}&apagadas=1")
    await expect(page.get_by_role("heading", name="2. Prepare a troca")).to_be_visible()
    await choose(page, "Conta anterior", "primeira · Ana")
    await choose(page, "Nova conta", "segunda · Bia")
    await page.get_by_role("button", name="Data da troca", exact=False).click()
    calendar = page.get_by_role("dialog", name="Data da troca", exact=True)
    target = calendar.locator(f'button[data-dia="{instant.date().isoformat()}"]')
    if not await target.count():
        await calendar.get_by_role("button", name="Mês anterior", exact=True).click()
    await target.click()
    await page.get_by_label("Hora da troca", exact=True).fill(
        instant.strftime("%H:%M:%S")
    )
    await choose(page, "Fuso da hora informada", "UTC +00:00")
    await choose(page, "Estado final da conta anterior", "Limitada")
    await page.get_by_role("button", name="Consultar prévia da troca").click()
    await expect(
        page.get_by_role("heading", name="3. Confira a prévia")
    ).to_be_visible()


async def confirm(page):
    await page.get_by_role("button", name="Continuar para confirmação").click()
    dialog = page.get_by_role("dialog", name="Confirmar esta troca?")
    await expect(dialog.get_by_role("button", name="Agora não")).to_be_focused()
    await dialog.get_by_role("button", name="Confirmar troca", exact=True).click()


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_troca(
    harness, engine_admin, tmp_path, viewport, browser_name
):
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        other_context = await browser.new_context(viewport=viewport)
        page, other = await context.new_page(), await other_context.new_page()
        user, _ = await core.backend.register(
            page,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        expiry = await core.grant(page, engine_admin, user["usuario_id"], seconds=120)
        house, source, target, start = await _setup(
            engine_admin, engine_admin, user["usuario_id"]
        )
        effective = (start + timedelta(days=5)).replace(microsecond=0)

        async def bet(offset):
            async with engine_admin.begin() as conn:
                return await conn.scalar(
                    insert(models.Aposta)
                    .values(
                        usuario_id=user["usuario_id"],
                        chave="switch:" + uuid4().hex,
                        origem="manual",
                        estado="PENDENTE",
                        stake_unidades=1,
                        stake_centavos=100,
                        conta_casa_id=source,
                        data_jogo=effective + timedelta(seconds=offset),
                    )
                    .returning(models.Aposta.id)
                )

        old = await bet(-1)
        affected = await bet(1)
        second, _ = await core.backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        assert user["usuario_id"] != second["usuario_id"]
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"troca-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await prepare(page, house, effective)
            await expect(
                page.get_by_role("list", name="Apostas para conferir")
            ).to_contain_text(str(affected))
            await expect(
                page.get_by_role("list", name="Apostas para conferir")
            ).not_to_contain_text(str(old))
            await page.get_by_text("Código de consulta", exact=True).click()
            first_key = (
                await page.locator("#troca-consulta")
                .locator("..")
                .locator("details .numero")
                .inner_text()
            )
            # A concurrently persisted bet changes the canonical confirmation population.
            added = await bet(2)
            async with page.expect_response(
                lambda r: (
                    r.request.method == "POST"
                    and r.url.endswith("/api/v1/titulares/trocas")
                )
            ) as refusing:
                await confirm(page)
            refused = await refusing.value
            assert refused.status == 409
            assert (await refused.json())["detail"] == "swap_preview_stale"
            await expect(
                page.get_by_text("A prévia não pode ser confirmada.", exact=False)
            ).to_be_visible()
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        select(models.ContaCasa.estado).where(
                            models.ContaCasa.id == source
                        )
                    )
                    == "EM_USO"
                )
                assert (
                    len(
                        list(
                            await conn.scalars(
                                select(models.UsoContaCasa).where(
                                    models.UsoContaCasa.usuario_id == user["usuario_id"]
                                )
                            )
                        )
                    )
                    == 1
                )
            retry_after = refused.headers.get("retry-after")
            if retry_after:
                assert retry_after.isdigit()
                delay = int(retry_after)
                if delay:
                    await expect(
                        page.get_by_role("button", name="Preparar outra troca")
                    ).to_be_disabled()
                    await expect(
                        page.get_by_text("O serviço pediu uma pausa", exact=False)
                    ).to_be_visible()
                    # Keep the real limiter/window. This is the server's published pause,
                    # outside the unchanged 30s action timeout, never a clock/limit rewrite.
                    await asyncio.sleep(delay + 0.1)
            # A safe owner GET refreshes the real session if needed and must not erase
            # the already-known requirement for a fresh preview after stale evidence.
            async with page.expect_response(
                lambda r: (
                    r.status == 200
                    and r.request.method == "GET"
                    and r.url.endswith("/api/v1/titulares/trocas/intencao")
                )
            ) as lookup:
                await page.get_by_role(
                    "button", name="Consultar resultado da mesma intenção"
                ).click()
            known = await (await lookup.value).json()
            assert known["estado"] == "PREVIEW" and known["recibo"] is None
            await expect(
                page.get_by_role("button", name="Preparar outra troca")
            ).to_be_enabled()
            await page.get_by_role("button", name="Preparar outra troca").click()
            await page.get_by_role("button", name="Consultar prévia da troca").click()
            await expect(
                page.get_by_role("heading", name="3. Confira a prévia")
            ).to_be_visible()
            await expect(
                page.get_by_role("list", name="Apostas para conferir")
            ).to_contain_text(str(added))
            await page.get_by_text("Código de consulta", exact=True).click()
            current_key = (
                await page.locator("#troca-consulta")
                .locator("..")
                .locator("details .numero")
                .inner_text()
            )
            await page.get_by_text("Código de consulta", exact=True).click()
            private_assert(first_key != current_key and current_key not in page.url)
            for theme in ("claro", "escuro"):
                await page.evaluate(
                    "async () => { window.scrollTo(0, 0); await document.fonts.ready; }"
                )
                await page.evaluate(
                    "theme => document.documentElement.dataset.tema=theme", theme
                )
                await core.accessibility(page)
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"troca-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )

            attempts = []
            lost_statuses = []
            committed_response = asyncio.Event()
            loop = asyncio.get_running_loop()

            def observe(request):
                if request.method == "POST" and request.url.endswith(
                    "/api/v1/titulares/trocas"
                ):
                    attempts.append(request.headers["idempotency-key"])

            def lose_committed_response(method, path, response):
                if method != "POST" or path != "/api/v1/titulares/trocas":
                    return False
                lost_statuses.append(response.status_code)
                loop.call_soon_threadsafe(committed_response.set)
                return len(lost_statuses) == 1

            page.on("request", observe)
            harness.frontend_proxy.after_api_response = lose_committed_response
            await confirm(page)
            await asyncio.wait_for(committed_response.wait(), timeout=30)
            await expect(
                page.get_by_text(
                    "O resultado deste pedido ainda não foi confirmado.", exact=False
                )
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Consultar resultado da mesma intenção")
            ).to_be_enabled()
            assert lost_statuses == [200], (
                "A response must be lost only after a real committed 200"
            )
            private_assert(attempts == [current_key])
            # Natural expiry, no modification of timestamps or limits to bypass permissions.
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await core.fresh_session(page)
            assert (await core.read(page, "/api/v1/billing/status"))[
                "access"
            ] == "READ_ONLY"
            await open_lookup(page, house, deleted=True)
            await restore_code(page, current_key)
            await expect(
                page.get_by_text("Os dados do pedido saíram da memória.", exact=False)
            ).to_be_visible()
            await page.get_by_role(
                "button", name="Consultar resultado da mesma intenção"
            ).click()
            await expect(
                page.get_by_role("heading", name="Troca confirmada")
            ).to_be_visible()
            private_assert(attempts == [current_key])
            assert lost_statuses == [200]
            async with engine_admin.connect() as conn:
                assert (
                    await conn.scalar(
                        select(models.ContaCasa.estado).where(
                            models.ContaCasa.id == source
                        )
                    )
                    == "LIMITADA"
                )
                assert (
                    await conn.scalar(
                        select(models.ContaCasa.estado).where(
                            models.ContaCasa.id == target
                        )
                    )
                    == "EM_USO"
                )
                assert set(
                    await conn.scalars(
                        select(models.Aposta.conta_casa_id).where(
                            models.Aposta.id.in_([old, affected, added])
                        )
                    )
                ) == {source}
                usages = list(
                    await conn.execute(
                        select(
                            models.UsoContaCasa.conta_casa_id,
                            models.UsoContaCasa.vigente_de,
                        ).where(models.UsoContaCasa.usuario_id == user["usuario_id"])
                    )
                )
                assert len(usages) == 2
                assert (
                    next(u for u in usages if u.conta_casa_id == target).vigente_de
                    == effective
                )
            # Same public UUID authorizes nothing for another real identity.
            await open_lookup(other, house)
            await restore_code(other, current_key)
            await other.get_by_role(
                "button", name="Consultar resultado da mesma intenção"
            ).click()
            await expect(
                other.get_by_text(
                    "Nenhum recibo de aplicação foi confirmado", exact=False
                )
            ).to_be_visible()
            assert (
                await other.get_by_role("heading", name="Troca confirmada").count() == 0
            )
            assert await page.locator("select,input[type=date]").count() == 0
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída").click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            private_assert(not await page.get_by_text(current_key, exact=True).count())
            assert await page.evaluate(
                "() => !Object.values(sessionStorage).some(value => value.includes('conta_origem_id'))"
            )
            assert (
                await core.request(
                    page, "/api/v1/titulares/casas/" + str(house) + "/matriz"
                )
            )["status"] == 401
        except Exception:
            try:
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"troca-{browser_name}-{viewport['width']}-failure.png"
                    ),
                    full_page=True,
                    mask=[
                        page.locator("#troca-consulta details .numero"),
                        page.get_by_label("Código de consulta anterior"),
                    ],
                )
            except BrowserError:
                pass
            raise
        finally:
            harness.frontend_proxy.after_api_response = None
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await other_context.close()
            await browser.close()
