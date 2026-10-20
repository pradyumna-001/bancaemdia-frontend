"""Synthetic facts in the real disposable database, never response overrides."""

import importlib.util
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from bancaemdia import models
from bancaemdia.cli.refresh_painel import refresh_painel
from sqlalchemy import insert, select, text

_spec = importlib.util.spec_from_file_location(
    "performance_session_setup", Path(__file__).with_name("measurement_session.py")
)
session_setup = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(session_setup)


async def seed_large(core, page, engine_admin, engine_app, como, uid):
    from tests.integration.test_reviews_db import ordinary

    initial = await core.seed(page, engine_admin, uid)
    prefix = "Synthetic performance " + uuid4().hex
    async with engine_admin.begin() as conn:
        tipsters = list(
            await conn.scalars(
                insert(models.Tipster).returning(models.Tipster.id),
                [{"nome": f"{prefix} tipster {i:02d}"} for i in range(40)],
            )
        )
        markets = list(
            await conn.scalars(
                insert(models.Mercado).returning(models.Mercado.id),
                [
                    {"nome": f"{prefix} mercado {i:02d}", "familia": "GOLS"}
                    for i in range(40)
                ],
            )
        )
        banks = list(
            await conn.scalars(
                insert(models.Banca).returning(models.Banca.id),
                [
                    {
                        "usuario_id": uid,
                        "nome": f"Acompanhamento {i:02d}",
                        "saldo_inicial_centavos": 10000,
                        "criado_em": datetime(2026, 1, 1, tzinfo=UTC),
                    }
                    for i in range(40)
                ],
            )
        )
        holders = list(
            await conn.scalars(
                insert(models.Titular).returning(models.Titular.id),
                [
                    {"usuario_id": uid, "nome": f"Titular de teste {i:02d}"}
                    for i in range(40)
                ],
            )
        )
        accounts = list(
            await conn.scalars(
                insert(models.ContaCasa).returning(models.ContaCasa.id),
                [
                    {
                        "usuario_id": uid,
                        "casa_id": initial["house"],
                        "titular_id": holders[i],
                        "banca_id": banks[i],
                        "apelido": f"Conta de teste {i:02d}",
                        "estado": "DISPONIVEL",
                    }
                    for i in range(40)
                ],
            )
        )
        template = await conn.scalar(
            select(models.Evento.payload_json)
            .where(
                models.Evento.usuario_id == uid,
                models.Evento.aposta_chave == initial["keys"][0],
                models.Evento.tipo == "APOSTA_CRIADA",
            )
            .order_by(models.Evento.id)
            .limit(1)
        )
        bets, events = [], []
        # These are declared source facts, not expected profits or browser sums.
        outcomes = [("GREEN", 20000), ("RED", 0), ("PENDENTE", None), ("CASHOUT", 7000)]
        for i in range(5000):
            # A principal account spans all 90 days; the others have occasional
            # activity. Avoid equal/modulo-correlated banks with a single outcome.
            bank_index = 0 if i < 2500 else 1 + i % 39
            key = "performance-" + uuid4().hex
            day = datetime(2026, 10, 10, tzinfo=UTC) - timedelta(days=i % 90)
            stamp = day + timedelta(hours=i % 24)
            state, returned = outcomes[i % len(outcomes)]
            bets.append(
                {
                    "usuario_id": uid,
                    "chave": key,
                    "origem": "manual",
                    "estado": state,
                    "stake_unidades": 1,
                    "stake_centavos": 10000,
                    "valor_aposta_centavos": 10000,
                    "retorno_centavos": returned,
                    "odd": 2,
                    "data_aposta": stamp,
                    "data_jogo": stamp,
                    "conta_casa_id": accounts[bank_index],
                    "banca_id": banks[bank_index],
                    "tipster_id": tipsters[i % 40],
                    "mercado_id": markets[i % 40],
                }
            )
            events.append(
                {
                    "usuario_id": uid,
                    "tipo": "APOSTA_CRIADA",
                    "fonte": "manual",
                    "aposta_chave": key,
                    "payload_json": {
                        **template,
                        "evento": f"Série de acompanhamento {i:04d} · Time da casa × Visitante",
                        "descricao": "Total de gols · seleção de teste com descrição extensa",
                        "data_aposta": stamp.isoformat(),
                        "data_jogo": stamp.isoformat(),
                        "conta_casa_id": accounts[bank_index],
                    },
                }
            )
        await conn.execute(insert(models.Aposta), bets)
        await conn.execute(insert(models.Evento), events)
        await conn.execute(
            insert(models.MetaDesempenho),
            [
                {
                    "usuario_id": uid,
                    "titulo": f"Acompanhamento de registros {i:02d}",
                    "metrica": "total_apostas",
                    "inicio": date(2026, 7, 1),
                    "fim": date(2026, 10, 31),
                    "alvo": Decimal(1000),
                    "linha_base": Decimal(0),
                    "status": "ativa",
                }
                for i in range(30)
            ],
        )
        await conn.execute(
            insert(models.Movimento),
            [
                {
                    "usuario_id": uid,
                    "conta_casa_id": accounts[0],
                    "tipo": "DEPOSITO",
                    "valor_centavos": 10000,
                    "ocorrido_em": datetime(2026, 10, 10, 12, i, tzinfo=UTC),
                    "descricao": "Entrada de teste",
                }
                for i in range(60)
            ],
        )
    # Reuse server-owned review fixtures, including their authoritative evidence.
    for i in range(30):
        await ordinary(
            engine_app, como, uid, accounts[0], evento=f"Leitura de teste {i:02d}"
        )
    await refresh_painel(engine_admin)
    # Large database setup may outlive the fixture's 30-second access token.
    # Renew through the real HTTP contract before checking the actual population.
    await session_setup.prepare_session(page, core.backend.FRONT)
    await core.fresh_session(page)
    listed = await core.read(page, "/api/v1/apostas?periodo=all&page_size=100")
    async with engine_admin.connect() as conn:
        counts = (
            await conn.execute(
                text(
                    "SELECT count(DISTINCT tipster_id), count(DISTINCT mercado_id), "
                    "count(DISTINCT data_aposta::date) FROM apostas WHERE usuario_id=:uid"
                ),
                {"uid": uid},
            )
        ).one()
    assert listed["pagination"]["total"] >= 5000, "Large API population missing"
    assert len(listed["data"]) == 100, "Large API page missing"
    dataset = {
        "bets": listed["pagination"]["total"],
        "tipsters": counts[0],
        "markets": counts[1],
        "days": counts[2],
    }
    return initial, dataset
