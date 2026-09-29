# Inventário de contratos — 29/09/2026

Inventário do OpenAPI versionado; main e oito snapshots de PR. Não é uma API integrada nem comprovação de deploy. Rotas internas fora do OpenAPI são descritas no relatório.

28 operações HTTP na main; 42 operações adicionais distintas na união dos snapshots. Método + caminho define operação.

| Origem  | Commit                                                                                                        | Operações no snapshot | Acréscimos sobre main |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------------------: | --------------------: |
| main    | [bd055417459f](https://github.com/pradyumna-001/bancaemdia-api/tree/bd055417459f796fed960b5b37efb33a9744419f) |                    28 |                     0 |
| PR #130 | [e2c77b630238](https://github.com/pradyumna-001/bancaemdia-api/tree/e2c77b6302387727f5c78f4ea0a406b7905c7a74) |                    30 |                     2 |
| PR #136 | [94a8f7ed8a3a](https://github.com/pradyumna-001/bancaemdia-api/tree/94a8f7ed8a3a5b012d83a62c54d7708c7f76f550) |                    43 |                    15 |
| PR #154 | [66b80ad44b2e](https://github.com/pradyumna-001/bancaemdia-api/tree/66b80ad44b2ebdbb6de6559c0fa027308a075891) |                    35 |                     7 |
| PR #156 | [88d0081c4de9](https://github.com/pradyumna-001/bancaemdia-api/tree/88d0081c4de90466a7bd76e211e51affa269c7fe) |                    32 |                     4 |
| PR #157 | [ab7737a9e19e](https://github.com/pradyumna-001/bancaemdia-api/tree/ab7737a9e19ea546d88767c387d762005b2db04c) |                    28 |                     0 |
| PR #158 | [e3fa8aea2da0](https://github.com/pradyumna-001/bancaemdia-api/tree/e3fa8aea2da0ca64038244968222684df2b1db3d) |                    38 |                    10 |
| PR #162 | [6b2d3e3ecbae](https://github.com/pradyumna-001/bancaemdia-api/tree/6b2d3e3ecbae31d2990a3b3f7073a4f1647e2c4d) |                    47 |                    19 |
| PR #163 | [ef92395d6042](https://github.com/pradyumna-001/bancaemdia-api/tree/ef92395d60423c29b4a6f6d405fccb3a13f285d1) |                    34 |                     6 |

## Operações na main

| Método | Caminho                                      | Parâmetros                                                                                                                                                                                           |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/apostas`                            | query:desde, query:ate, query:estado, query:casa_id, query:tipster_id, query:mercado_id, query:competicao_id, query:origem, query:revisao_grave, query:incluir_apagadas, query:page, query:page_size |
| POST   | `/api/v1/apostas`                            | —                                                                                                                                                                                                    |
| POST   | `/api/v1/apostas/importar-planilha`          | —                                                                                                                                                                                                    |
| DELETE | `/api/v1/apostas/{chave}`                    | path:chave                                                                                                                                                                                           |
| GET    | `/api/v1/apostas/{chave}`                    | path:chave                                                                                                                                                                                           |
| PATCH  | `/api/v1/apostas/{chave}`                    | path:chave                                                                                                                                                                                           |
| POST   | `/api/v1/apostas/{chave}/restaurar`          | path:chave                                                                                                                                                                                           |
| POST   | `/api/v1/apostas/{chave}/resultado`          | path:chave                                                                                                                                                                                           |
| GET    | `/api/v1/caixa`                              | query:conta_casa_id, query:tipo, query:desde, query:ate, query:page, query:page_size                                                                                                                 |
| POST   | `/api/v1/caixa`                              | header:Idempotency-Key                                                                                                                                                                               |
| PATCH  | `/api/v1/caixa/contas/{conta_casa_id}/banca` | path:conta_casa_id                                                                                                                                                                                   |
| GET    | `/api/v1/caixa/extrato`                      | query:conta_casa_id, query:desde, query:ate, query:page, query:page_size                                                                                                                             |
| GET    | `/api/v1/caixa/saldo`                        | query:data_corte                                                                                                                                                                                     |
| POST   | `/api/v1/coleta`                             | —                                                                                                                                                                                                    |
| GET    | `/api/v1/painel`                             | query:periodo, query:casa_id, query:tipster_id, query:mercado_id, query:fresh                                                                                                                        |
| GET    | `/api/v1/painel/export`                      | query:periodo, query:casa_id, query:tipster_id, query:mercado_id                                                                                                                                     |
| GET    | `/api/v1/painel/metricas`                    | query:periodo, query:casa_id, query:tipster_id, query:mercado_id                                                                                                                                     |
| GET    | `/api/v1/revisao`                            | query:motivo, query:desde, query:ate, query:page, query:page_size                                                                                                                                    |
| GET    | `/api/v1/revisao/stats`                      | —                                                                                                                                                                                                    |
| GET    | `/api/v1/revisao/{revisao_id}`               | path:revisao_id                                                                                                                                                                                      |
| GET    | `/api/v1/revisao/{revisao_id}/foto`          | path:revisao_id                                                                                                                                                                                      |
| POST   | `/api/v1/revisao/{revisao_id}/resolver`      | path:revisao_id                                                                                                                                                                                      |
| POST   | `/api/v1/upload`                             | —                                                                                                                                                                                                    |
| GET    | `/api/v1/upload/{job_id}`                    | path:job_id                                                                                                                                                                                          |
| POST   | `/coleta`                                    | —                                                                                                                                                                                                    |
| GET    | `/health`                                    | —                                                                                                                                                                                                    |
| GET    | `/metrics`                                   | —                                                                                                                                                                                                    |
| GET    | `/ready`                                     | —                                                                                                                                                                                                    |

## Acréscimos em PRs abertos

| Método | Caminho                                                   | Snapshots onde foi encontrado               |
| ------ | --------------------------------------------------------- | ------------------------------------------- |
| POST   | `/api/v1/billing/cancel`                                  | PR #154                                     |
| POST   | `/api/v1/billing/portal`                                  | PR #154                                     |
| GET    | `/api/v1/billing/status`                                  | PR #154                                     |
| POST   | `/api/v1/billing/subscribe`                               | PR #154                                     |
| POST   | `/api/v1/billing/webhook`                                 | PR #154                                     |
| POST   | `/api/v1/calculadoras/cobertura-ao-vivo`                  | PR #156                                     |
| POST   | `/api/v1/calculadoras/distribuir-entre-resultados`        | PR #156                                     |
| POST   | `/api/v1/calculadoras/mercado-justo`                      | PR #156                                     |
| POST   | `/api/v1/calculadoras/percentual-banca`                   | PR #156                                     |
| GET    | `/api/v1/coleta/installations`                            | PR #163                                     |
| DELETE | `/api/v1/coleta/installations/{instalacao_id}`            | PR #163                                     |
| POST   | `/api/v1/coleta/installations/{instalacao_id}/rotate`     | PR #163                                     |
| POST   | `/api/v1/coleta/pairing-codes`                            | PR #163                                     |
| POST   | `/api/v1/coleta/pairing-exchange`                         | PR #163                                     |
| GET    | `/api/v1/coleta/status`                                   | PR #163                                     |
| POST   | `/api/v1/integrations/telegram/webhook`                   | PR #162                                     |
| GET    | `/api/v1/painel/analises`                                 | PR #158                                     |
| GET    | `/api/v1/painel/metas`                                    | PR #158                                     |
| POST   | `/api/v1/painel/metas`                                    | PR #158                                     |
| DELETE | `/api/v1/painel/metas/{meta_id}`                          | PR #158                                     |
| GET    | `/api/v1/painel/metas/{meta_id}`                          | PR #158                                     |
| PATCH  | `/api/v1/painel/metas/{meta_id}`                          | PR #158                                     |
| GET    | `/api/v1/painel/preferencias`                             | PR #158                                     |
| PATCH  | `/api/v1/painel/preferencias`                             | PR #158                                     |
| DELETE | `/api/v1/telegram/link`                                   | PR #162                                     |
| GET    | `/api/v1/telegram/link`                                   | PR #162                                     |
| POST   | `/api/v1/telegram/link-codes`                             | PR #162                                     |
| GET    | `/api/v1/titulares`                                       | PR #136, PR #162                            |
| POST   | `/api/v1/titulares`                                       | PR #136, PR #162                            |
| GET    | `/api/v1/titulares/casas/{casa_id}/matriz`                | PR #136, PR #162                            |
| GET    | `/api/v1/titulares/financeiro`                            | PR #136, PR #162                            |
| POST   | `/api/v1/titulares/trocas`                                | PR #136, PR #162                            |
| POST   | `/api/v1/titulares/trocas/preview`                        | PR #136, PR #162                            |
| DELETE | `/api/v1/titulares/{titular_id}`                          | PR #136, PR #162                            |
| GET    | `/api/v1/titulares/{titular_id}`                          | PR #136, PR #162                            |
| PATCH  | `/api/v1/titulares/{titular_id}`                          | PR #136, PR #162                            |
| POST   | `/api/v1/titulares/{titular_id}/contas`                   | PR #136, PR #162                            |
| PATCH  | `/api/v1/titulares/{titular_id}/contas/{conta_id}`        | PR #136, PR #162                            |
| POST   | `/api/v1/titulares/{titular_id}/contas/{conta_id}/ativar` | PR #136, PR #162                            |
| GET    | `/api/v1/titulares/{titular_id}/matriz`                   | PR #136, PR #162                            |
| DELETE | `/api/v1/usuario/me`                                      | PR #130, PR #136, PR #154, PR #158, PR #162 |
| GET    | `/api/v1/usuario/me/export`                               | PR #130, PR #136, PR #154, PR #158, PR #162 |
