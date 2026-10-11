"""Whole central journey through one reconciled API and the public SPA.

Only seed data is synthetic. No API response, authentication or SPA state is mocked.
The candidate remains distinct from an integrated release.
"""

import asyncio
import hashlib
import importlib.util
import json
import os
import secrets
import sys
import time
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, urlencode
from uuid import uuid4

import pytest
from bancaemdia import models
from playwright.async_api import async_playwright, expect
from sqlalchemy import insert, text

_spec = importlib.util.spec_from_file_location(
    "frontend_identity_helpers", Path(__file__).with_name("test_browser_contract.py")
)
helpers = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = helpers
_spec.loader.exec_module(helpers)
banco = helpers.banco
harness = helpers.harness
backend = helpers.backend
request = helpers.browser_request


async def fresh_session(page):
    # Enter through the actual SPA before using the memory-only CSRF in test setup.
    await page.goto(backend.FRONT + "/")
    await expect(
        page.get_by_role("heading", name="Apostas", exact=True)
    ).to_be_visible()
    session = await request(page, "/auth/session")
    assert session["status"] == 200
    return session["data"]


async def grant(page, engine, uid, seconds=360):
    assert (await request(page, "/api/v1/billing/status"))["status"] == 200
    async with engine.begin() as conn:
        await conn.execute(text("SELECT billing_activate_rollout()"))
        await conn.execute(
            text(
                "WITH bounds AS (SELECT clock_timestamp()+make_interval(secs=>:seconds) AS finish) "
                "UPDATE assinaturas SET trial_confirmed=true, trial_ends_at=bounds.finish, "
                "trial_started_at=bounds.finish-interval '168 hours' FROM bounds WHERE usuario_id=:uid"
            ),
            {"seconds": seconds, "uid": uid},
        )
    status = await request(page, "/api/v1/billing/status")
    assert status["status"] == 200 and status["data"]["access"] == "FULL_WRITE"
    return datetime.fromisoformat(status["data"]["trial_ends_at"]).timestamp()


async def write(page, path, body=None, method="POST", expected=200):
    session = (await request(page, "/auth/session"))["data"]
    result = await request(
        page, path, method=method, csrf=session["csrf_token"], body=body
    )
    assert result["status"] == expected, "Seed/intent refused by the real API"
    return result["data"]


async def seed(page, engine, uid):
    async with engine.begin() as conn:
        house = await conn.scalar(
            insert(models.Casa)
            .values(nome="Betano", dominio="betano.com")
            .returning(models.Casa.id)
        )
    holders, accounts = [], []
    for name in ("Titular central A", "Titular central B"):
        holder = await write(page, "/api/v1/titulares", {"nome": name}, expected=201)
        account = await write(
            page,
            f"/api/v1/titulares/{holder['id']}/contas",
            {"casa_id": house, "apelido": name.replace("Titular", "Conta")},
            expected=201,
        )
        assert account["estado"] == "DISPONIVEL" and not account["historico_uso"]
        holders.append(holder["id"])
        accounts.append(account["conta_casa_id"])
    keys = []
    for index in range(5):
        body = {
            "casa": "Betano",
            "odd": 2,
            "stake_unidades": 1,
            "evento": f"Jornada central {index}",
            "descricao": "Mais de 2,5 gols",
            "mercado_bruto": "Total de gols",
            "data_aposta": "2026-10-10T12:00:00Z",
            "data_jogo": "2026-10-10T15:00:00Z",
            "freebet": index == 2,
        }
        if index < 4:
            body["conta_casa_ref"] = accounts[0 if index < 3 else 1]
        created = await write(page, "/api/v1/apostas", body, expected=201)
        key = created["aposta"]["chave"]
        keys.append(key)
        if index < 4:
            await write(
                page,
                "/api/v1/apostas/" + quote(key, safe="") + "/resultado",
                {"estado": "GREEN" if index in (0, 2) else "RED"},
            )
    image = (helpers.ROOT / "tests/fixtures/midia/foto.png").read_bytes()
    image_hash = hashlib.sha256(image).hexdigest()
    async with engine.begin() as conn:
        orphan = await conn.scalar(
            insert(models.ContaCasa)
            .values(usuario_id=uid, casa_id=house, apelido="Conta sem titular")
            .returning(models.ContaCasa.id)
        )
        for index in (5, 6):
            key = "central-legacy-" + uuid4().hex
            keys.append(key)
            await conn.execute(
                insert(models.Aposta).values(
                    usuario_id=uid,
                    chave=key,
                    origem="manual",
                    estado="PENDENTE",
                    stake_unidades=1,
                    stake_centavos=10000,
                    data_aposta=datetime(2026, 10, 10, 12, tzinfo=UTC),
                    conta_casa_id=orphan if index == 5 else None,
                )
            )
        await conn.execute(
            text(
                "INSERT INTO midias(hash,tipo,bytes) VALUES (:hash,'image/png',:size) ON CONFLICT DO NOTHING"
            ),
            {"hash": image_hash, "size": len(image)},
        )
        await conn.execute(
            text(
                "INSERT INTO midia_arquivos(hash,conteudo) VALUES (:hash,:body) ON CONFLICT DO NOTHING"
            ),
            {"hash": image_hash, "body": image},
        )
        review = await conn.scalar(
            insert(models.RevisaoPendente)
            .values(
                usuario_id=uid,
                midia_hash=image_hash,
                motivo="FOTO",
                extracao_bruta={"aposta_chave": keys[0]},
                resolvido_em=datetime.now(UTC),
            )
            .returning(models.RevisaoPendente.id)
        )
    return {
        "house": house,
        "holders": holders,
        "accounts": accounts,
        "keys": keys,
        "orphan": orphan,
        "review": review,
        "image": image,
    }


async def read(page, path):
    result = await request(page, path)
    assert result["status"] == 200, "Read refused by the real API"
    return result["data"]


async def assert_population(page, query, total):
    encoded = urlencode(query)
    listed = await read(page, "/api/v1/apostas?" + encoded + "&page_size=100")
    summary = await read(page, "/api/v1/painel/filtrado?" + encoded)
    daily = await read(
        page, "/api/v1/painel/filtrado/diario?" + encoded + "&dias_por_pagina=14"
    )
    groups = await read(page, "/api/v1/painel/filtrado/grupos?" + encoded)
    assert listed["pagination"]["total"] == summary["resumo"]["total_apostas"] == total
    assert (
        daily["total_periodo"]["total_apostas"]
        == groups["total_periodo"]["total_apostas"]
        == total
    )
    # The legacy summary covers settled facts; the daily contract also makes
    # pending/unknown money explicit. Match population and the published known
    # subset without treating the legacy subtotal as a complete financial result.
    for field in ("giro_centavos", "base_roi_centavos"):
        assert str(summary["resumo"][field]) == daily["total_periodo"][field]
    for old_field, known_field in (
        ("lucro_centavos", "lucro_conhecido_centavos"),
        ("retorno_centavos", "retorno_conhecido_centavos"),
    ):
        legacy = summary["resumo"][old_field]
        if legacy is not None:
            assert str(legacy) == daily["total_periodo"][known_field]
        complete = daily["total_periodo"][old_field]
        if complete is not None:
            assert str(legacy) == complete
            assert summary["resumo"]["roi"] == daily["total_periodo"]["roi"]
    assert daily["total_periodo"] == groups["total_periodo"]
    assert summary["snapshot_em"] and daily["snapshot_em"] and groups["snapshot_em"]
    return listed, daily


async def accessibility(page):
    # Same axe implementation already versioned in the frontend dependency lock.
    axe = helpers.ROOT / "node_modules/.pnpm/node_modules/axe-core/axe.min.js"
    await page.evaluate(axe.read_text(encoding="utf8"))
    violations = await page.evaluate(
        "async () => (await axe.run(document)).violations.map(v => v.id)"
    )
    assert violations == [], "Public central screen has accessibility violations"
    original = page.viewport_size
    await page.set_viewport_size({"width": 320, "height": 844})
    assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    await page.set_viewport_size(original)


def sanitize_trace(path):
    # Authentication and seed finish before tracing. Keep action timing/stacks,
    # discard network/resources and evaluated results (which may contain CSRF).
    with zipfile.ZipFile(path) as source:
        files = {
            name: source.read(name)
            for name in source.namelist()
            if name.endswith((".trace", ".stacks"))
        }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as target:
        for name, content in files.items():
            if name.endswith(".trace"):
                entries = []
                for line in content.splitlines():
                    entry = json.loads(line)
                    entry.pop("result", None)
                    entries.append(json.dumps(entry))
                content = ("\n".join(entries) + "\n").encode()
            target.writestr(name, content)


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_central_journey(
    harness, engine_admin, viewport, browser_name
):
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
        await grant(page, engine_admin, session["usuario_id"])
        data = await seed(page, engine_admin, session["usuario_id"])
        await context.tracing.start(screenshots=False, snapshots=False, sources=False)
        try:
            await fresh_session(page)
            await expect(
                page.get_by_role("region", name="Resumo desta visão")
            ).to_contain_text("Valores financeiros dos resultados já liquidados")
            query = {
                "conta_casa_id": str(data["accounts"][0]),
                "visibilidade": "ativas",
            }
            rows, summary = await assert_population(page, query, 3)
            free = next(row for row in rows["data"] if row["freebet"])
            assert (
                free["stake_centavos"] == 0 and free["valor_aposta_centavos"] == 10000
            )
            assert summary["total_periodo"]["lucro_centavos"] == "10000"
            all_rows, all_summary = await assert_population(
                page, {"visibilidade": "todas"}, 7
            )
            assert all_summary["total_periodo"]["lucro_centavos"] is None
            assert (
                next(
                    row for row in all_rows["data"] if row["chave"] == data["keys"][6]
                )["evento"]
                is None
            )
            assert any(row["conta_contexto"] is None for row in all_rows["data"])
            orphan = next(
                row for row in all_rows["data"] if row["chave"] == data["keys"][5]
            )
            assert orphan["conta_contexto"]["titular"] is None
            _, second = await assert_population(
                page, {"conta_casa_id": str(data["accounts"][1])}, 1
            )
            assert second["total_periodo"]["lucro_centavos"] == "-10000"
            search = "?" + urlencode(
                {
                    "conta": data["accounts"][0],
                    "casa": data["house"],
                    "periodo": "all",
                    "page_size": 2,
                    "visualizacao": "lista",
                }
            )
            await page.goto(backend.FRONT + "/" + search)
            await expect(page.get_by_role("article")).to_have_count(2)
            await page.get_by_role("button", name="Mostrar mais", exact=True).click()
            await expect(page.get_by_role("article")).to_have_count(3)
            await page.reload()
            await expect(page.get_by_role("article")).to_have_count(2)
            assert urlsplit_query(page.url)["conta"] == str(data["accounts"][0])
            await page.get_by_role("button", name="Mostrar mais", exact=True).click()
            await page.get_by_role("link", name="Jornada central 0", exact=True).focus()
            await page.keyboard.press("Enter")
            await expect(
                page.get_by_role("heading", level=1, name="Jornada central 0")
            ).to_be_visible()
            assert urlsplit_query(page.url)["casa"] == str(data["house"])
            await page.get_by_role("button", name="Corrigir aposta", exact=True).click()
            await page.get_by_label("Evento", exact=True).fill("Jornada corrigida")
            await page.get_by_role(
                "button", name="Salvar alterações", exact=True
            ).click()
            await expect(
                page.get_by_role("heading", level=1, name="Jornada corrigida")
            ).to_be_visible()
            key = quote(data["keys"][0], safe="")
            detail = await read(page, "/api/v1/apostas/" + key)
            assert any(
                event["tipo"] == "CORRECAO_MANUAL" for event in detail["eventos"]
            )
            photo_link = page.get_by_role("link", name="Consultar foto original")
            await photo_link.focus()
            await page.keyboard.press("Enter")
            await page.get_by_role("button", name="Abrir foto", exact=True).click()
            await expect(
                page.get_by_role(
                    "img", name="Foto original vinculada a esta aposta", exact=True
                )
            ).to_be_visible()
            assert (
                await page.request.get(
                    backend.FRONT + f"/api/v1/revisao/{data['review']}/foto"
                )
            ).status == 404
            await page.get_by_role("link", name="Voltar para a aposta").click()
            await page.get_by_role("button", name="Apagar aposta", exact=True).click()
            await (
                page.get_by_role("dialog")
                .get_by_role("button", name="Confirmar", exact=True)
                .click()
            )
            await expect(
                page.get_by_role("button", name="Restaurar aposta", exact=True)
            ).to_be_enabled()
            await assert_population(page, query, 2)
            deleted, _ = await assert_population(
                page, {**query, "visibilidade": "apagadas"}, 1
            )
            assert (
                deleted["data"][0]["chave"] == data["keys"][0]
                and deleted["data"][0]["apagada"]
            )
            await assert_population(page, {**query, "visibilidade": "todas"}, 3)
            await page.get_by_role(
                "button", name="Restaurar aposta", exact=True
            ).click()
            await (
                page.get_by_role("dialog")
                .get_by_role("button", name="Confirmar", exact=True)
                .click()
            )
            await expect(
                page.get_by_role("button", name="Apagar aposta", exact=True)
            ).to_be_enabled()
            await assert_population(page, query, 3)
            await page.goto(backend.FRONT + "/painel" + search)
            await expect(
                page.get_by_role("region", name="Resumo financeiro do diário")
            ).to_be_visible()
            await expect(page.locator(".painel-resumo")).to_contain_text("R$ 100,00")
            await accessibility(page)
            response = await page.request.get(
                backend.FRONT
                + "/api/v1/painel/filtrado/detalhado/export?"
                + urlencode(query)
            )
            assert response.status == 200 and (await response.body()).startswith(b"PK")
            await page.goto(backend.FRONT + "/" + search)
            await expect(page.get_by_role("article")).to_have_count(2)
            await page.get_by_role("button", name="Remover filtro Conta").click()
            assert "conta" not in urlsplit_query(page.url)
            await page.go_back()
            await expect(page.get_by_role("article")).to_have_count(2)
            assert urlsplit_query(page.url)["conta"] == str(data["accounts"][0])
            await accessibility(page)
        finally:
            await context.tracing.stop(
                path=str(
                    Path(os.environ.get("CORE_TRACE_DIR", "."))
                    / f"central-{browser_name}-{viewport['width']}.zip"
                )
            )
            sanitize_trace(
                Path(os.environ.get("CORE_TRACE_DIR", "."))
                / f"central-{browser_name}-{viewport['width']}.zip"
            )
        await context.close()
        await browser.close()


def urlsplit_query(url):
    from urllib.parse import parse_qsl, urlsplit

    return dict(parse_qsl(urlsplit(url).query))


@pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
@pytest.mark.parametrize(
    "viewport", [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
)
async def test_public_spa_central_access_isolation(
    harness, engine_admin, viewport, browser_name
):
    async with async_playwright() as playwright:
        browser = await getattr(playwright, browser_name).launch()
        context = await browser.new_context(viewport=viewport)
        other_context = await browser.new_context(viewport=viewport)
        page, other = await context.new_page(), await other_context.new_page()
        email, password = uuid4().hex + "@example.org", secrets.token_urlsafe(24)
        session, _ = await backend.register(page, email, password, harness=harness)
        await grant(page, engine_admin, session["usuario_id"])
        data = await seed(page, engine_admin, session["usuario_id"])
        second, _ = await backend.register(
            other,
            uuid4().hex + "@example.org",
            secrets.token_urlsafe(24),
            harness=harness,
        )
        expiry = await grant(other, engine_admin, second["usuario_id"], seconds=30)
        await fresh_session(page)
        key = quote(data["keys"][0], safe="")
        await page.goto(backend.FRONT + "/aposta/" + key)
        await expect(
            page.get_by_role("heading", level=1, name="Jornada central 0")
        ).to_be_visible()
        foreign = await request(other, "/api/v1/apostas/" + key)
        assert foreign["status"] == 404
        assert (await request(other, "/api/v1/apostas/" + key + "/foto"))[
            "status"
        ] == 404
        assert (await read(other, "/api/v1/apostas"))["pagination"]["total"] == 0
        assert (await read(other, "/api/v1/titulares"))["total"] == 0
        await asyncio.sleep(max(0, expiry - time.time()) + 1)
        await fresh_session(other)
        await expect(
            other.get_by_role("heading", name="Sua conta está em modo de leitura")
        ).to_be_visible()
        assert (await read(other, "/api/v1/billing/status"))["access"] == "READ_ONLY"
        live = (await request(other, "/auth/session"))["data"]
        refused = await request(
            other,
            "/api/v1/apostas",
            method="POST",
            csrf=live["csrf_token"],
            body={"casa": "Betano", "odd": 2, "stake_unidades": 1},
        )
        assert (
            refused["status"] == 402
            and refused["data"]["detail"] == "account_read_only"
        )
        assert (await read(other, "/auth/session"))["usuario_id"] == second[
            "usuario_id"
        ]
        await page.goto(backend.FRONT + "/sair")
        await page.get_by_role("button", name="Sair desta conta").click()
        await expect(
            page.get_by_role("heading", name="Entrar", exact=True)
        ).to_be_visible()
        assert (await request(page, "/api/v1/apostas/" + key))["status"] == 401
        assert not await page.get_by_text("Jornada central 0", exact=True).count()
        await context.close()
        await other_context.close()
        await browser.close()
