# API Contracts — Tela → Endpoint

Mapeamento das telas v2 (ADR 013) para `/api/v1` conforme `docs/API.md` do backend (pradyumna-001/bancaemdia-api). Status:

- ✅ coberto pela API atual
- ⚠️ parcial / confirmar comportamento exato com backend
- ❌ lacuna — abrir issue em `bancaemdia-api` antes da semana consumidora

## Apostas

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Lista com filtros e paginação | `GET /api/v1/apostas` | ⚠️ | Confirmar filtros exatos (casa, tipster, grupo, banca, estado, origem, de/ate), cursor/"mostrar mais", projeção de resumo (lucro/ROI da capa) e mini-séries para os 3 mini-gráficos (`painel/metricas` pode servir) |
| Visão de apagadas | `GET /api/v1/apostas?apagadas=1` | ⚠️ | Confirmar filtro/flag na API |
| Aviso de foto duplicada / dúvida de par | campos em lista/`{chave}` | ⚠️ | Confirmar campos (`midia_hash`, `duvida_de_par`, `parceira_chave`) na listagem |
| Detalhe + foto | `GET /api/v1/apostas/{chave}` + mídia | ⚠️ | Endpoint de foto por hash (`/foto/{hash}` antigo) — confirmar equivalente |
| Corrigir campos allowlist | `PATCH /api/v1/apostas/{chave}` | ✅ | UI limita aos campos do allowlist (`CAMPOS_DA_APOSTA`) |
| Apagar / restaurar | `DELETE /{chave}` / `POST /{chave}/restaurar` | ✅ | Soft delete; pílulas preservam `apagadas=1` |
| Registrar resultado | `POST /api/v1/apostas/{chave}/resultado` | ✅ | Estados: GREEN/RED/ANULADA/CASHOUT/MEIO_GREEN/MEIO_RED |
| Resolver dúvida de par (`/par` antigo) | — | ❌ | Confirmar se PATCH/endpoint dedicado cobre "É a mesma"/"São diferentes" |
| Nova aposta manual com freebet | `POST /api/v1/apostas` | ✅ | Validar regra `freebet XOR stake` vem do backend |
| Importar planilha com prévia | `POST /api/v1/apostas/importar-planilha` | ⚠️ | Confirmar fluxo de dois passos (prévia de mapeamento → confirmar) |

## Painel

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Capa, odd média, fator de lucro, faixas de stake | `GET /api/v1/painel` | ✅ | Períodos 7/30/90/tudo |
| Série de evolução + barras grupo→tipster + mini-gráficos da home | `GET /api/v1/painel/metricas` | ⚠️ | Confirmar séries: lucro/dia, lucro/tipster, resultado de ontem, n por barra (espessura=√n) |
| Tabela completa por grupo | `GET /api/v1/painel` (?tabela) | ⚠️ | Confirmar flag/seção |
| Hipotética `/e-se` | — | ❌ | Endpoint de projeção hipotética (stake do tipster) não consta na API.md |
| Exportar Excel | `GET /api/v1/painel/export` | ✅ | Download autenticado de blob |

## Caixa / Banca

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Lançar depósito/saque | `POST /api/v1/caixa` | ✅ | |
| Listar movimentos / extrato | `GET /api/v1/caixa`, `GET /caixa/extrato` | ✅ | |
| Saldos por casa/banca | `GET /api/v1/caixa/saldo` | ✅ | |
| Transferência entre casas | ⚠️ | Confirmar se é `POST /caixa` duplo ou endpoint dedicado | |
| Vincular conta à banca | `PATCH /caixa/contas/{id}/banca` | ✅ | Modo conjunta/separada por grupo (capital mode) |
| Capital inicial, apelidos de casa | — | ❌ | Confirmar cobertura na API |

## Revisão

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Fila + contador do menu | `GET /api/v1/revisao`, `/revisao/stats` | ✅ | Contador alimenta a aba Revisão |
| Bilhete com foto | `GET /revisao/{id}`, `/revisao/{id}/foto` | ✅ | |
| Resolver com correções | `POST /revisao/{id}/resolver` | ✅ | |

## Entrada assíncrona

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Upload exportação Telegram | `POST /api/v1/upload` (202) + `GET /upload/{job_id}` | ✅ | Polling (ADR 003) |
| Cartão de autorização de gasto (cartão do pode) | estado no job | ⚠️ | Confirmar estados do job: `aguardando_autorizacao`, proveniência de preço, caminho "Agora não" |
| Upload de prints (drag-drop, dedupe por hash) | — | ❌ | Confirmar endpoint de prints / campo no upload |

## Coleta / Extensão

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Hub: status, criar/rotacionar token, instalação | — | ❌ | Endpoints de gestão de token de coleta não constam na API.md (o `POST /coleta` é da extensão, não da UI) |
| Download `extensao.zip` | — | ❌ | Decidir: asset estático do frontend ou servido pela API |

## Conta / Configurações

| Tela/fluxo | Endpoint | Status | Nota |
|---|---|---|---|
| Login/signup/senha/confirmar e-mail/convite | provedor de identidade | ❌ | API só valida JWT por JWKS; escolher provedor (Cognito/Supabase/Auth0/próprio) — **primeira lacuna a resolver** (Semana 2 depende) |
| "Onde eu tenho conta" (casas desde/até) | — | ❌ | Endpoint de contas_casa com vigência |
| Unidade temporal, formato de odd, tema | — | ❌ | Endpoints de preferências/config do usuário (tema pode ser local) |
| Apagar tudo | — | ❌ | Endpoint destrutivo com confirmação pesada |
| Fotos por hash | — | ⚠️ | Confirmar rota de mídia com token |

## Regras de trabalho sobre lacunas

1. Lacuna ❌/⚠️ vira issue em `pradyumna-001/bancaemdia-api` no formato dos ADRs de lá — a UI nunca implementa contorno local.
2. Sintoma 422 em navegação indica contrato mal mapeado aqui — corrigir este documento junto.
3. Regenerar tipos (`make gen-types`) em cada mudança aceita de contrato (ADR 003).
