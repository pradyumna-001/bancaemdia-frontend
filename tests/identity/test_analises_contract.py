"""Approved analysis presentation against the real public SPA, API and PostgreSQL."""

import asyncio
import importlib.util
import json
import os
import secrets
import subprocess
import sys
import time
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import pytest
from bancaemdia import models
from bancaemdia.cli.refresh_painel import refresh_painel
from playwright.async_api import async_playwright, expect
from sqlalchemy import insert, text

_spec = importlib.util.spec_from_file_location(
    "frontend_analytics_core", Path(__file__).with_name("test_core_contract.py")
)
core = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = core
_spec.loader.exec_module(core)
banco = core.banco
harness = core.harness


@lru_cache
def brl(value, signed=True):
    # Reuse the actual canonical formatter; no second monetary scale in test code.
    source = json.dumps((core.helpers.ROOT / "src/lib/format.ts").as_uri())
    program = (
        f"import {{moeda}} from {source};"
        "let text='';for await(const chunk of process.stdin)text+=chunk;"
        "const [value,signed]=JSON.parse(text);process.stdout.write(moeda(value,signed));"
    )
    return subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", program],
        input=json.dumps([value, signed]),
        capture_output=True,
        check=True,
        encoding="utf8",
    ).stdout


async def seed(page, engine, uid):
    seeded = await core.seed(page, engine, uid)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "UPDATE apostas SET revisao_grave=true WHERE usuario_id=:uid AND chave=:key"
            ),
            {"uid": uid, "key": seeded["keys"][-1]},
        )
        sports = []
        for name in ("Futebol", "Tênis"):
            sport = await conn.scalar(
                text("SELECT id FROM esportes WHERE nome=:name"), {"name": name}
            )
            if sport is None:
                sport = await conn.scalar(
                    insert(models.Esporte)
                    .values(nome=name)
                    .returning(models.Esporte.id)
                )
            sports.append(sport)
        for index, sport in enumerate(sports):
            competition = await conn.scalar(
                insert(models.Competicao)
                .values(nome="Analysis synthetic " + uuid4().hex, esporte_id=sport)
                .returning(models.Competicao.id)
            )
            await conn.execute(
                text(
                    "UPDATE apostas SET competicao_id=:competition WHERE usuario_id=:uid AND chave=:key"
                ),
                {"competition": competition, "uid": uid, "key": seeded["keys"][index]},
            )
        bank = await conn.scalar(
            insert(models.Banca)
            .values(
                usuario_id=uid,
                nome="Banca de análise",
                saldo_inicial_centavos=10000,
                criado_em=datetime(2026, 1, 1, tzinfo=UTC),
            )
            .returning(models.Banca.id)
        )
        await conn.execute(
            text(
                "UPDATE contas_casa SET banca_id=:bank WHERE usuario_id=:uid AND id=:account"
            ),
            {"bank": bank, "uid": uid, "account": seeded["accounts"][0]},
        )
        await conn.execute(
            text(
                "UPDATE apostas SET banca_id=:bank WHERE usuario_id=:uid AND conta_casa_id=:account"
            ),
            {"bank": bank, "uid": uid, "account": seeded["accounts"][0]},
        )
        for kind, amount in (("DEPOSITO", 20000), ("SAQUE", -3000)):
            await conn.execute(
                insert(models.Movimento).values(
                    usuario_id=uid,
                    conta_casa_id=seeded["accounts"][0],
                    tipo=kind,
                    valor_centavos=amount,
                    ocorrido_em=datetime(2026, 10, 10, 12, tzinfo=UTC),
                )
            )
    await refresh_painel(engine)
    return seeded


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_analises(
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
        expiry = await core.grant(page, engine_admin, user["usuario_id"], seconds=45)
        seeded = await seed(page, engine_admin, user["usuario_id"])
        await core.write(
            page, "/api/v1/painel/preferencias", {"fuso_horario": "UTC"}, method="PATCH"
        )
        second, _ = await core.backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        assert user["usuario_id"] != second["usuario_id"]
        await asyncio.sleep(max(0, expiry - time.time()) + 1)
        # Renew the actual server session after the harness access token expires.
        await core.fresh_session(page)
        assert (await core.read(page, "/api/v1/billing/status"))[
            "access"
        ] == "READ_ONLY"
        data = await core.read(page, "/api/v1/painel/analises?periodo=all")
        cash = await core.read(page, "/api/v1/painel?periodo=all")
        assert (
            data["fuso_horario"] == "UTC"
            and data["total_filtrado"]["total_apostas"] > 0
        )
        assert any(row["nome"] == "Futebol" for row in data["por_esporte"])
        assert any(row["chave"] == "unknown" for row in data["por_esporte"])
        assert data["total_filtrado"]["pendentes"] > 0
        trace = (
            Path(os.environ["CORE_TRACE_DIR"])
            / f"analises-{browser_name}-{viewport['width']}.zip"
        )
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await page.goto(
                core.backend.FRONT + "/painel/analises?periodo=all&apagadas=1"
            )
            await expect(
                page.get_by_role("heading", name="Análises", exact=True)
            ).to_be_visible()
            await expect(page.locator(".analises-resumo")).to_contain_text(
                brl(data["total_filtrado"]["lucro_centavos"])
            )
            await expect(page.locator(".analises-escopo")).to_contain_text("apagadas")
            for row in data["por_esporte"]:
                name = row["nome"] or "Esporte não informado"
                target = page.locator(
                    "#analises-esportes .analises-barras > li"
                ).filter(has=page.get_by_text(name, exact=True))
                await expect(target).to_contain_text(brl(row["lucro_centavos"]))
                await expect(target).to_contain_text(f"{row['total_apostas']} apostas")
            table = page.locator("#analises-esportes details")
            await table.locator("summary").focus()
            await page.keyboard.press("Enter")
            await expect(table.get_by_role("table")).to_be_visible()
            for title in (
                "Faixas de odds",
                "Dias da semana e horários",
                "Faixas de valor de face",
                "Progressão por banca",
            ):
                await page.get_by_text(title, exact=True).click()
            await expect(
                page.get_by_role("region", name="Mapa de dias e horários")
            ).to_be_visible()
            for name in (
                "Depósitos acumulados",
                "Saques acumulados",
                "Saldo",
                "Lucro acumulado",
            ):
                radio = page.get_by_role("radio", name=name, exact=True)
                await radio.click()
                await expect(radio).to_be_checked()
            await expect(
                page.get_by_role("heading", name="Banca de análise", exact=True)
            ).to_be_visible()
            for point in cash["evolucao"]:
                name = point["banca_nome"] or "Sem banca atribuída"
                region = page.locator(".analises-banca").filter(
                    has=page.get_by_role("heading", name=name, exact=True)
                )
                details = region.locator("details")
                if await details.get_attribute("open") is None:
                    await details.locator("summary").click()
                date = point["periodo_inicio"]
                visible_row = region.locator(".serie-valores").get_by_role("row").filter(
                    has=page.get_by_role(
                        "rowheader", name=f"{date[8:10]}/{date[5:7]}/{date[:4]}"
                    )
                )
                await expect(visible_row).to_contain_text(
                    brl(point["lucro_periodo_centavos"], signed=True)
                )
                await expect(visible_row).to_contain_text(
                    brl(point["lucro_acumulado_centavos"], signed=True)
                )
                row = details.get_by_role("row").filter(
                    has=page.get_by_role(
                        "rowheader", name=f"{date[8:10]}/{date[5:7]}/{date[:4]}"
                    )
                )
                for field in (
                    "lucro_acumulado_centavos",
                    "depositos_acumulados_centavos",
                    "saques_acumulados_centavos",
                    "saldo_centavos",
                ):
                    await expect(row).to_contain_text(
                        brl(point[field], signed=field == "lucro_acumulado_centavos")
                    )
            await core.fresh_session(other)
            assert (await core.read(other, "/api/v1/painel/analises?periodo=all"))[
                "total_filtrado"
            ]["total_apostas"] == 0
            await other.goto(core.backend.FRONT + "/painel/analises?periodo=all")
            await expect(
                other.get_by_role("heading", name="Sem apostas neste recorte")
            ).to_be_visible()
            # Safe retained filters survive a real link; no web filter simulates a population.
            await expect(
                page.get_by_role("link", name="Voltar ao Painel")
            ).to_have_attribute(
                "href",
                "/painel?periodo=all&apagadas=1&caixa_serie=lucro_acumulado_centavos",
            )
            assert await page.locator("select,input[type=date]").count() == 0
            for theme in ("claro", "escuro"):
                await page.evaluate(
                    "theme => document.documentElement.dataset.tema = theme", theme
                )
                await core.accessibility(page)
                await page.screenshot(
                    path=str(
                        Path(os.environ["CORE_TRACE_DIR"])
                        / f"analises-{browser_name}-{viewport['width']}-{theme}.png"
                    ),
                    full_page=True,
                )
            await page.goto(
                core.backend.FRONT
                + "/painel/analises?periodo=all&casa="
                + str(seeded["house"])
            )
            await expect(
                page.get_by_role("heading", name="Lucro por esporte")
            ).to_be_visible()
            await core.open_read_only_logout(page)
            await page.get_by_role("button", name="Confirmar saída", exact=True).click()
            await expect(
                page.get_by_role("heading", name="Entrar", exact=True)
            ).to_be_visible()
            assert (await core.request(page, "/api/v1/painel/analises"))[
                "status"
            ] == 401
            assert not await page.get_by_text("Banca de análise", exact=True).count()
        finally:
            await context.tracing.stop(path=trace)
            core.sanitize_trace(trace)
            await context.close()
            await other_context.close()
            await browser.close()
