"""Optional goals and the shared timezone through the real public SPA and API."""

import asyncio
import importlib.util
import json
import os
import re
import secrets
import subprocess
import sys
import time
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import pytest
from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright, expect
from sqlalchemy import text

_spec = importlib.util.spec_from_file_location(
    "frontend_goals_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness
LIST = "/api/v1/painel/metas"


@lru_cache
def formatted(kind, value):
    source = json.dumps((core.helpers.ROOT / "src/lib/format.ts").as_uri())
    program = (
        f"import {{moedaDecimalCentavos,percentualDecimal,decimal,decimalEditavel}} from {source};"
        "let input='';for await(const chunk of process.stdin)input+=chunk;"
        "const [kind,value]=JSON.parse(input);process.stdout.write(kind==='money'?"
        "moedaDecimalCentavos(value):kind==='ratio'?percentualDecimal(value):"
        "decimal(decimalEditavel(value).replace(',','.')));"
    )
    return subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", program],
        input=json.dumps([kind, value]),
        capture_output=True,
        check=True,
        encoding="utf8",
    ).stdout


async def choose(page, label, value):
    button = page.get_by_role("button", name=re.compile("^" + re.escape(label) + " "))
    await expect(button).to_be_enabled()
    await button.focus()
    await expect(button).to_be_focused()
    await page.keyboard.press("Enter")
    dialog = page.get_by_role("dialog", name=label, exact=True)
    await expect(dialog).to_be_visible()
    await dialog.get_by_role("button", name=value, exact=True).click()
    await expect(dialog).not_to_be_visible()
    await expect(button).to_be_focused()


async def date(page, label, value):
    await page.get_by_role(
        "button", name=re.compile("^" + re.escape(label) + " ")
    ).click()
    calendar = page.get_by_role("dialog", name=label, exact=True)
    day = calendar.locator(f'button[data-dia="{value}"]')
    for _ in range(36):
        if await day.count():
            await day.click()
            return
        middle = (
            await calendar.locator("button[data-dia]").nth(15).get_attribute("data-dia")
        )
        await calendar.get_by_role(
            "button",
            name="Mês anterior" if value < middle else "Próximo mês",
            exact=True,
        ).click()
    pytest.fail("Goal date could not be chosen through the calendar", pytrace=False)


async def fill(page, title):
    button = page.get_by_role("button", name="Nova meta", exact=True)
    await expect(button).to_be_enabled()
    await button.click()
    await expect(page.get_by_label("Título", exact=True)).to_have_value("")
    await expect(page.get_by_label("Linha base", exact=True)).to_have_value("")
    await page.get_by_label("Título", exact=True).fill(title)
    await choose(page, "Métrica", "Lucro")
    await date(page, "Data inicial da meta", "2026-10-01")
    await date(page, "Data final da meta", "2026-10-31")
    await page.get_by_label("Alvo", exact=True).fill("1000,00")
    await page.get_by_label("Linha base", exact=True).fill("0")


async def check_card(page, meta):
    card = page.get_by_role("article").filter(
        has=page.get_by_role("heading", name=meta["titulo"], exact=True)
    )
    kind = (
        "money"
        if meta["metrica"].endswith("_centavos")
        else "ratio"
        if meta["metrica"] in {"roi", "win_rate"}
        else "decimal"
    )
    for label, field in (
        ("Valor atual", "valor_atual"),
        ("Alvo", "alvo"),
        ("Linha base", "linha_base"),
    ):
        await expect(card.get_by_text(label, exact=True).locator("..")).to_contain_text(
            formatted(kind, meta[field])
        )
    await expect(
        card.get_by_text("Progresso informado", exact=True).locator("..")
    ).to_contain_text(
        "Não calculável"
        if meta["progresso"] is None
        else formatted("ratio", meta["progresso"])
    )
    await expect(card).to_contain_text(
        "Alvo atingido, conforme os dados consultados."
        if meta["alvo_atingido"]
        else "Alvo ainda não atingido, conforme os dados consultados."
    )


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_metas(harness, engine_admin, viewport, browser_name):
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
        expiry = await core.grant(page, engine_admin, user["usuario_id"], seconds=180)
        seeded = await core.seed(page, engine_admin, user["usuario_id"])
        seeded_goals = []
        for metric, target, baseline in (
            ("roi", "0.1", "0.1"),
            ("win_rate", "0.6", "0"),
            ("total_apostas", "10", "0"),
            ("giro_centavos", "10000", "20000"),
        ):
            seeded_goals.append(
                await core.write(
                    page,
                    LIST,
                    {
                        "titulo": "Referência " + metric,
                        "metrica": metric,
                        "inicio": "2026-10-01",
                        "fim": "2026-10-31",
                        "alvo": target,
                        "linha_base": baseline,
                    },
                    expected=201,
                )
            )
        await core.backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        async with engine_admin.connect() as conn:
            before = list(
                await conn.execute(
                    text(
                        "SELECT chave,stake_centavos,valor_aposta_centavos,retorno_centavos,conta_casa_id "
                        "FROM apostas WHERE usuario_id=:uid ORDER BY chave"
                    ),
                    {"uid": user["usuario_id"]},
                )
            )
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"metas-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            address = (
                core.backend.FRONT + f"/painel/metas?casa={seeded['house']}&apagadas=1"
            )
            await page.goto(address)
            await expect(
                page.get_by_role("heading", name=seeded_goals[0]["titulo"], exact=True)
            ).to_be_visible()
            for meta in seeded_goals:
                await check_card(page, meta)
            assert seeded_goals[0]["progresso"] is None
            await expect(
                page.get_by_text("não se aplicam às metas", exact=False)
            ).to_be_visible()
            await fill(page, "Meta real da SPA")
            async with page.expect_response(
                lambda r: (
                    r.request.method == "POST"
                    and r.url.endswith(LIST)
                    and r.status == 201
                )
            ) as created:
                await page.get_by_role("button", name="Criar meta", exact=True).click()
            goal = await (await created.value).json()
            await expect(page.get_by_text("Meta criada.", exact=True)).to_be_visible()
            await check_card(page, goal)
            await page.get_by_role(
                "button", name="Editar Meta real da SPA", exact=True
            ).click()
            await page.get_by_label("Título", exact=True).fill("Meta real revisada")
            await choose(page, "Status da meta", "Concluída")
            await page.get_by_role("button", name="Salvar alterações da meta").click()
            await expect(
                page.get_by_text("Meta atualizada.", exact=True)
            ).to_be_visible()
            current = await core.read(page, LIST + "/" + str(goal["id"]))
            assert current["status"] == "concluida"
            await check_card(page, current)
            archive = page.get_by_role(
                "button", name="Arquivar Meta real revisada", exact=True
            )
            await archive.click()
            dialog = page.get_by_role("dialog", name="Arquivar esta meta?")
            await expect(dialog.get_by_role("button", name="Agora não")).to_be_focused()
            await page.keyboard.press("Escape")
            await expect(archive).to_be_focused()
            await archive.click()
            await dialog.get_by_role("button", name="Arquivar meta", exact=True).click()
            await expect(
                page.get_by_text("Meta arquivada.", exact=False)
            ).to_be_visible()
            assert (await core.read(page, LIST + "/" + str(goal["id"])))[
                "status"
            ] == "arquivada"
            await choose(page, "Mostrar metas", "Arquivada")
            await expect(
                page.get_by_role("heading", name="Meta real revisada")
            ).to_be_visible()
            assert f"casa={seeded['house']}" in page.url and "apagadas=1" in page.url
            await choose(page, "Mostrar metas", "Todas as metas")
            await expect(
                page.get_by_label("Fuso das análises", exact=True)
            ).to_be_enabled()
            await page.get_by_label("Fuso das análises", exact=True).click()
            await (
                page.get_by_role("dialog", name="Escolher fuso das análises")
                .get_by_role("button", name="UTC", exact=True)
                .click()
            )
            await page.get_by_role("button", name="Salvar fuso", exact=True).click()
            await expect(
                page.get_by_text("Fuso salvo: UTC.", exact=False)
            ).to_be_visible()
            assert (await core.read(page, "/api/v1/painel/preferencias"))[
                "fuso_horario"
            ] == "UTC"
            assert (await core.read(page, LIST + "/" + str(goal["id"])))[
                "inicio"
            ] == "2026-10-01"
            for theme in ("claro", "escuro"):
                await page.evaluate(
                    "async () => { window.scrollTo(0,0); await document.fonts.ready; }"
                )
                await page.evaluate(
                    "value => document.documentElement.dataset.tema=value", theme
                )
                await core.accessibility(page)
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"metas-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )
            await page.goto(address)
            await expect(
                page.get_by_role("heading", name="Meta real revisada")
            ).to_be_visible()
            await fill(page, "Criação com resposta perdida")
            sends, statuses = [], []
            committed = asyncio.Event()
            loop = asyncio.get_running_loop()

            def observe(request):
                if request.method == "POST" and request.url.endswith(LIST):
                    sends.append(True)

            def lose_response(method, path, response):
                if method != "POST" or path != LIST:
                    return False
                statuses.append(response.status_code)
                loop.call_soon_threadsafe(committed.set)
                return len(statuses) == 1

            page.on("request", observe)
            harness.frontend_proxy.after_api_response = lose_response
            await page.get_by_role("button", name="Criar meta", exact=True).click()
            await asyncio.wait_for(committed.wait(), timeout=30)
            await expect(
                page.get_by_role(
                    "heading", name="Não recebemos confirmação deste pedido"
                )
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Consultar lista de metas")
            ).to_be_enabled()
            assert statuses == [201] and len(sends) == 1
            await page.get_by_role("button", name="Consultar lista de metas").click()
            await expect(
                page.get_by_text(
                    "Lista consultada. Ela não confirma o resultado daquela criação.",
                    exact=True,
                )
            ).to_be_visible()
            await expect(
                page.get_by_role("heading", name="Criação com resposta perdida")
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Criar meta", exact=True)
            ).to_be_disabled()
            await page.get_by_role(
                "button", name="Encerrar este acompanhamento"
            ).click()
            await (
                page.get_by_role("dialog", name="Fechar este formulário?")
                .get_by_role("button", name="Fechar formulário")
                .click()
            )
            assert statuses == [201] and len(sends) == 1
            harness.frontend_proxy.after_api_response = None
            await asyncio.sleep(max(0, expiry - time.time()) + 1)
            await core.fresh_session(page)
            assert (await core.read(page, "/api/v1/billing/status"))[
                "access"
            ] == "READ_ONLY"
            await page.goto(address)
            await expect(
                page.get_by_role("heading", name="Criação com resposta perdida")
            ).to_be_visible()
            await expect(
                page.get_by_role("button", name="Nova meta", exact=True)
            ).to_be_disabled()
            await page.get_by_role("button", name="Consultar metas", exact=True).click()
            await expect(
                page.get_by_text("Metas consultadas.", exact=True)
            ).to_be_visible()
            await expect(
                page.get_by_label("Fuso das análises", exact=True)
            ).to_be_disabled()
            await other.goto(address)
            await expect(
                other.get_by_role("heading", name="Você ainda não criou metas")
            ).to_be_visible()
            assert (await core.request(other, LIST + "/" + str(goal["id"])))[
                "status"
            ] == 404
            async with engine_admin.connect() as conn:
                after = list(
                    await conn.execute(
                        text(
                            "SELECT chave,stake_centavos,valor_aposta_centavos,retorno_centavos,conta_casa_id "
                            "FROM apostas WHERE usuario_id=:uid ORDER BY chave"
                        ),
                        {"uid": user["usuario_id"]},
                    )
                )
            assert after == before
            assert await page.locator("select,input[type=date]").count() == 0
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída").click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert await page.get_by_text("Meta real revisada", exact=True).count() == 0
        except Exception:
            try:
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"metas-{browser_name}-{viewport['width']}-failure.png"
                    ),
                    full_page=True,
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
