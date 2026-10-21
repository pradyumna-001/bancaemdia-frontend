# Lacunas de contrato da API — revalidação de 21/10/2026

Issue #50, ADR019. Auditoria estática de documentos OpenAPI, sem alteração no backend, merge, deploy ou promoção de schema. A [matriz](../API-CONTRACTS.md) resume o estado por capacidade; este registro guarda método, evidências e os textos de issue ainda não criados na API.

## Método

1. Main da API lida em `b916f54331f14cf47a3800324bd61d8638043c06` (`git show <sha>:tests/contract/schemas/openapi.json`).
2. Cada PR aberta da API lida no seu head (`GET /repos/pradyumna-001/bancaemdia-api/contents/tests/contract/schemas/openapi.json?ref=<head>`). Um documento por versão; nenhum JSON foi mesclado.
3. Operações comparadas por método+caminho, parâmetros e respostas. Para sobreposições, cada operação foi comparada com o fechamento transitivo dos schemas que referencia.
4. Ancestralidade verificada por `compare/<a>...<b>`: todas as candidatas estão à frente da main, sem atraso, e divergem entre si.
5. Checks e mergeabilidade lidos de `gh pr view` em 21/10/2026. Lacunas sem rota foram confirmadas nos modelos da API (somente leitura) e no monólito `planilhador-apostas`.

Sandboxes de reconciliação usados por consumidoras (`codex/site-review-frontend-reconciliation` em `547a4d0c`, e outros citados nas issues da API) não entram na matriz: não são versão integrada.

## Documentos lidos

| Versão | Head completo                              | Ops | SHA-256 do OpenAPI                                                 | Checks        |
| ------ | ------------------------------------------ | --- | ------------------------------------------------------------------ | ------------- |
| main   | `b916f54331f14cf47a3800324bd61d8638043c06` | 89  | `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a` | integrada     |
| #184   | `0409b6bdd287c11aba4c242352e8de7d9b13148f` | 96  | `9c8362d4c4396882a126c4469a2478e6ab462f4a254ccc440173f03adb3cd53f` | 28/28 sucesso |
| #185   | `97442320f8ae85487c0e9840cc575b0466002b6f` | 94  | `b7a3474969cb56d475c504495ae6f9fa583845e2f75b10d783b050d157f2224b` | 27/27 sucesso |
| #187   | `8461c5200da38c161acce5e74440817ab87e6c2b` | 89  | `fc0e3ee8f02d5bcc11822c14979f9a3f6702d7e8bafb3c0df8fd30b1ac6c5699` | 27/27 sucesso |
| #189   | `9c43485b7fb99e2b21b20e94a26edadc281426c8` | 99  | `ccb3c0e9dbecf2246fa1d774f4da486c5bfc93a1ea98fb0153f08c69bbbbf632` | 28/28 sucesso |
| #191   | `4c7d4914c36b68668118fe6c79f639db0818152e` | 97  | `cb740f3fc659a63e7f77ad24b80ba81b020e09b53f515c4daa71ea72568224f4` | 29/29 sucesso |
| #193   | `db58317664300410641a34785074776659aaaab9` | 90  | `3e7703936f01da5d516441cb058509c913b6c954c352fdc4086c257d1000230c` | 28/28 sucesso |
| #195   | `5142374cf6ae707b66986a2594061c24b27b5b5d` | 95  | `611c4bac8a38d62fb82769e3b1ef02f452b3dadf6bf088634ada6a8198c4a4c2` | 29/29 sucesso |
| #197   | `b34b63cd0826cd590fdc9c7710c23599d121e154` | 99  | `1029e4244c240489670652bae94d29c923ea16aa923f5fec01b070fc6925a78b` | 28/28 sucesso |
| #199   | `8c91557579ccee048ecc8ae8fecf69b90792dc0f` | 94  | `96c611047a8255d05e7371fa58353ec596b95198bff82f2d9f938608aa850a6b` | 28/28 sucesso |
| #201   | `d3a512442fc449186005ee86c47f998d0226a060` | 105 | `c0e8b4caf44ae7caf3e23b09fe2a72f39a3248da7b50d00c5ccbbd038c804879` | 31/31 sucesso |
| #203   | `bc368106da04a24c8a8b9a9827978ce476963e19` | 91  | `09f9c65f0813d3ab6ac25c26112031e26454c8096cdc68c4bf3cd16778e45104` | 28/28 sucesso |
| #205   | `5fb7dfe14bf993ae6942fa003e2a531277478ed4` | 89  | `57e14b12c87723b909e7150da031e8595ed428c7e7cb7902a437a820923c64a3` | 27/27 sucesso |
| #207   | `af2d2d034bd3312ec79dff141e0a15546b340362` | 90  | `90231c9dbdc7784141fb3bdd3a4299640eb6c1463240af2c0d95ce82fab9e1b6` | 27/27 sucesso |

Contagem de operações inclui `/health`, `/ready`, `/metrics` e webhooks. PRs antes listadas como candidatas e agora integradas: #130, #136, #154, #158, #162, #163, #164, #168. A #156 (calculadoras) foi fechada sem merge; as quatro rotas existem na main.

## Sobreposições entre candidatas

Cópias idênticas (operação e schemas referenciados):

- Superfície da #184 (filtros, catálogos, grupos, painel filtrado) dentro de #189 e #191.
- GET `/apostas/{chave}/foto` em #193, #195 e #201.
- Prints em #195 e #201.
- Resultados em #199 e #201.

Formas concorrentes da mesma operação:

| Operação                                                                                                | Grupos com documento idêntico                                             |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| GET `/apostas`                                                                                          | main e demais · #184/#189/#191 · #187                                     |
| PATCH `/apostas/{chave}`                                                                                | main e demais · #184/#189/#191 · #187                                     |
| GET `/revisao`                                                                                          | main e demais · #184/#189/#191 · #201                                     |
| POST `/revisao/{revisao_id}/resolver`                                                                   | main e demais · #184/#189/#191 · #187 · #201                              |
| GET `/painel`, `/metricas`, `/export`, `/analises`, `/caixa`, `/caixa/extrato`, `/titulares/financeiro` | main e demais · #184/#189/#191                                            |
| POST `/painel/metas`, PATCH `/painel/metas/{id}`                                                        | main/#185/#187 · as outras 11 candidatas (`MetaEntrada`, `MetaAlteracao`) |
| GET `/usuario/me/export`                                                                                | main e demais · #184/#189/#191 · #185 · #203                              |
| GET `/coleta/installations`                                                                             | main e demais · #205                                                      |
| POST `/titulares/trocas`, `/trocas/preview`                                                             | main e demais · #207                                                      |

Consequência: a integração exige uma árvore única reconciliada pela API. Nenhuma consumidora pode tipar a lista com #184 e a projeção com #187 ao mesmo tempo, nem combinar documentos. Até lá, cada consumidora declara a candidata única que usa e mantém o gate de publicação integrada.

Extensões de política divergentes:

| Aspecto          | Main                                                                                     | Candidatas                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso comercial | nenhuma                                                                                  | `x-access-modes` (#195, #197); `x-permission` (#203, #205); `x-commercial-access` (#191); `access` em `x-bancaemdia-resultados` (#199, #201) e `x-bancaemdia-review` (#201) |
| Retry automático | nenhuma                                                                                  | `x-automatic-retry` (#195, #203); `x-client-auto-retry` (#197); `automatic_mutation_replay` (#199, #201); `automatic_retry` em `x-idempotency` (#203)                       |
| Idempotência     | cabeçalho `Idempotency-Key` em POST `/caixa`, `/billing/subscribe`, `/titulares/trocas*` | identidade de intenção no caminho (#195, #197, #199, #201, #203); só #203 declara a identidade (`x-idempotency.identity=path.intencao_id`)                                  |
| 402 na lista     | declarado também em leituras permitidas em READ_ONLY                                     | #193, #195 (GETs), #191 e #205 removem 402 das leituras; #197, #199, #201 e #203 mantêm 402 em leituras marcadas READ_ONLY                                                  |

`scripts/api-contract.mjs` gera `IDEMPOTENT_OPERATIONS` apenas a partir do cabeçalho. Identidades no caminho e permissões por operação não chegam às políticas geradas. Ver L4.

## Revisão #28

A lacuna registrada em `docs/audits/revisao-2026-10-13.md` (branch `feat/28-revisao`, PR #94): MESMA não aceitava escolha de tipster e POST `/consolidacoes` exigia IDs internos não publicados. Foi suprida pela issue API #200 / [PR #201](https://github.com/pradyumna-001/bancaemdia-api/pull/201): `/revisao-operacional/*` publica a projeção segura, ações por família, `TipsterChoice`/`AccountChoice`/`HolderChoice` e precondição opaca (`x-bancaemdia-review.precondition=opaque_evidence_cas`). Nenhum texto de issue novo é necessário. A #28 continua dependente do merge da #201; não promover o schema candidato.

## Capacidades sem issue na API em 21/10/2026

| Lacuna | Evidência na API                                                                                                                                                   | Consumidor    | Recomendação                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------- |
| L1     | Tabela `unidades` (`valor_centavos`, `vigente_de`, `vigente_ate`), `UnidadeRepo.get_vigente/create`; nenhuma rota; padrão `VALOR_UNIDADE_PADRAO_CENTAVOS = 10_000` | #33, #29      | Aberta: [#210](https://github.com/pradyumna-001/bancaemdia-api/issues/210)                                 |
| L2     | Tabela `bancas` (`nome`, `saldo_inicial_centavos`); leitura em `/caixa/saldo`; escrita só do vínculo da conta                                                      | #31, #33, #20 | Aberta: [#211](https://github.com/pradyumna-001/bancaemdia-api/issues/211)                                 |
| L3     | DELETE/restaurar por aposta; DELETE `/usuario/me` encerra a conta                                                                                                  | #33           | Aberta: [#212](https://github.com/pradyumna-001/bancaemdia-api/issues/212), escopo confirmado pelo titular |
| L4     | Extensões divergentes listadas acima                                                                                                                               | #9, #10, #52  | Aberta: [#213](https://github.com/pradyumna-001/bancaemdia-api/issues/213)                                 |
| L5     | Odd armazenada em decimal; sem rota de preferência                                                                                                                 | #33           | Não abrir; registrar decisão                                                                               |

## Textos de issue para a API

Com confirmação do usuário em 21/10/2026, L1–L4 foram criadas na API como [#210](https://github.com/pradyumna-001/bancaemdia-api/issues/210), [#211](https://github.com/pradyumna-001/bancaemdia-api/issues/211), [#212](https://github.com/pradyumna-001/bancaemdia-api/issues/212) e [#213](https://github.com/pradyumna-001/bancaemdia-api/issues/213), acrescidas de um parágrafo de origem. Os textos abaixo são a fonte; o estado vigente está nas issues.

### L1 — Unidade temporal

**Título:** Valor da unidade com vigência publicado para o site (#33/#29 frontend)

**Problema confirmado.** Na main `b916f54`, a API converte `stake_unidades` com a unidade vigente do usuário (`UnidadeRepo.get_vigente` em `api/v1/apostas.py`, `workers/materialization.py`) e grava `valor_unidade_centavos` em cada aposta. A tabela `unidades` tem `valor_centavos`, `vigente_de` e `vigente_ate`, mas não existe rota para ler ou criar vigências. Sem vigência, vale R$ 100,00 (`VALOR_UNIDADE_PADRAO_CENTAVOS`). O monólito tinha POST `/configuracoes/unidade`, criado depois de um caso real em que R$ 100,00 foi planilhado como 10u porque o usuário não conseguia informar o valor. O site não pode resolver isso no cliente.

**Escopo mínimo.**

1. GET da unidade vigente e do histórico de vigências do usuário autenticado, com valor em centavos exatos (inteiro seguro ou string decimal), início, fim, origem (padrão do sistema ou definida pelo usuário) e fuso aplicado ao início.
2. Escrita que cria nova vigência a partir de um instante definido pelo servidor (o monólito usava hoje), sem reescrever apostas anteriores. Responder com o efeito: a partir de quando vale e que apostas existentes não mudam.
3. Idempotência por identidade escolhida pelo cliente antes do envio (cabeçalho ou caminho, mas declarada no OpenAPI), com consulta de recuperação após resposta perdida. Mesmo corpo devolve o recibo original; corpo diferente conflita.
4. Validação no servidor: valor positivo, limite máximo, recusa de valor ambíguo. 422 com código por campo, sem `msg`/`input`/`ctx` obrigatórios.
5. Escrita exige FULL_WRITE e CSRF; leitura permitida em READ_ONLY, declarada por operação. 401/402/409/422/429/503 publicados.
6. Documentar a relação com criação manual (#202/#203), coleta, Telegram e XLSX: todas leem a mesma vigência e o replay de uma intenção não recalcula a unidade.

**Provas.** HTTP + PostgreSQL: vigência nova não altera `stake_centavos` nem `valor_unidade_centavos` de apostas anteriores; aposta criada depois usa o novo valor; replay da mesma identidade não cria segunda vigência; RLS entre usuários; READ_ONLY lê e não escreve; concorrência de duas escritas converge.

**Entrega.** PR contra main, declarando dependências abertas, sem merge administrativo. O frontend gera tipos somente da versão integrada.

### L2 — Banca: cadastro, capital e modo

**Título:** Bancas com cadastro, capital inicial e modo conjunta/por grupo para o site (#31/#33 frontend)

**Problema confirmado.** A main `b916f54` tem a tabela `bancas` (`nome`, `saldo_inicial_centavos`) e a lê em GET `/caixa/saldo` (`SaldoBancaSaida`) e em `por_banca_progressao` das análises. A única escrita é PATCH `/caixa/contas/{conta_casa_id}/banca`, que vincula uma conta a uma banca já existente. Não há como criar, renomear ou arquivar banca, nem informar ou apagar o capital inicial. A #184 cria grupos (`/grupos`) e publica o catálogo `bancas`, mas não escreve bancas. O monólito oferecia `/banca/capital` (campo vazio apaga o capital, e a progressão mostra "—") e `/banca/modo` (conjunta por padrão ou uma por grupo, decisão do dono em 17/08/2026, sem destruir capital ao trocar).

**Escopo mínimo.**

1. Listar bancas do usuário com id BIGINT exato, nome, estado (ativa/arquivada), capital inicial em centavos ou null, e contas vinculadas.
2. Criar, renomear e arquivar banca. Arquivar não apaga movimentos nem vínculos históricos; definir o que acontece com contas vinculadas.
3. Definir e remover capital inicial. Null significa não informado e a API deve continuar devolvendo progressão null, não zero.
4. Decidir no backend se o modo conjunta/por grupo entra no produto. Se entrar, publicar o modo, como cada leitura (saldo, análises, painel filtrado por `banca_id`) o respeita e que trocar de modo não destrói capital. Se não entrar, registrar a decisão na issue.
5. Escritas idempotentes por identidade declarada; 409 para conflito de nome/estado; 422 por campo; FULL_WRITE e CSRF; leituras em READ_ONLY declaradas por operação.
6. Manter titular, conta, casa e banca como entidades distintas.

**Provas.** HTTP + PostgreSQL: criar/renomear/arquivar com replay; capital null versus zero nas leituras de saldo e análises; vínculo de conta a banca arquivada recusado; RLS; READ_ONLY; filtros `banca_id` da #184 (se integrada) refletem a banca criada.

### L3 — Apagar todas as apostas sem encerrar a conta

**Título:** Apagar todas as apostas em lote, reversível, sem encerrar a conta (#33 frontend)

**Decisão do titular em 21/10/2026:** a função continua no escopo. O backlog #33 removeu "Apagar tudo" das Configurações até existir contrato e deixou o reset para a #50.

**Problema confirmado.** A API tem DELETE e POST `/restaurar` por aposta. DELETE `/usuario/me` encerra a conta (#58), o que é diferente. O monólito tinha POST `/configuracoes/apagar-tudo` (pedido do dono em 18/08/2026), com confirmação digitada, que registrava um cancelamento por aposta num log append-only, mantinha a opção de ver e restaurar e não apagava nada fisicamente. Fazer N DELETEs no navegador não é atômico nem recuperável.

**Escopo mínimo.**

1. Operação de lote no servidor com identidade de intenção declarada, recibo consultável e contagem de apostas afetadas. Replay não duplica eventos.
2. Semântica igual ao DELETE atual (apagada, não removida), visível com `visibilidade=apagadas` (#184) e reversível por restauração em lote da mesma intenção.
3. Escopo explícito: apostas apenas, ou também movimentos de caixa, grupos e bancas. Cadastro, titulares, assinatura e vínculos de Telegram/coleta não mudam.
4. Confirmação forte definida pelo servidor (frase ou token de prévia), não só pelo botão do cliente.
5. Operação assíncrona se o volume exigir, com estados reais.
6. FULL_WRITE e CSRF; 402 sem efeito; 409 se outra operação em lote estiver em curso.

**Provas.** Lote com milhares de apostas; replay; restauração; agregados do painel e caixa coerentes depois de apagar e restaurar; RLS; falha no meio sem estado parcial.

### L4 — Política de acesso, retry e idempotência legível por máquina

**Título:** Uma extensão OpenAPI única para acesso, retry e identidade de idempotência (#9/#10/#52 frontend)

**Problema confirmado.** As candidatas abertas declaram a mesma política com extensões diferentes (ver a tabela de extensões divergentes acima). A main não declara nenhuma. Em várias leituras permitidas em READ_ONLY, a lista de respostas inclui 402. O cliente do frontend gera políticas somente do documento (`IDEMPOTENT_OPERATIONS` a partir do cabeçalho `Idempotency-Key`). Identidades no caminho, permissões por operação e proibição de retry ficam fora das políticas geradas, e o frontend não pode presumir pelo verbo HTTP (regra 32).

**Escopo mínimo.**

1. Uma extensão por operação, com schema publicado e validado no CI da API, por exemplo `x-bancaemdia-policy` com: modos de acesso (`FULL_WRITE`, `READ_ONLY`), retry automático permitido (e limites, se houver), identidade de idempotência (`header:Idempotency-Key`, `path:<param>` ou nenhuma), retenção da identidade e caminho de recuperação.
2. Migrar as candidatas para essa extensão na reconciliação, sem mudar o comportamento.
3. Remover 402 da lista de respostas de operações que nunca o devolvem, ou documentar quando o devolvem.
4. Teste de contrato que falha se uma operação nova não declarar a política.

**Provas.** Checker no CI da API cobrindo todas as operações; diff mostrando que o comportamento HTTP não muda.

### L5 — Formato de odd

Não abrir issue. A odd é armazenada e calculada em decimal. No monólito, a preferência existia no domínio (`odds.FORMATOS`), mas `definir_formato` não tinha chamador, e todas as contas usavam decimal. Mostrar a odd em decimal no frontend é formatação (regra 1). Se o titular pedir formatos americano/fracionário persistidos entre dispositivos, abrir issue para GET/PATCH de preferência do usuário, sem alterar o valor armazenado nem aceitar odd não decimal em entradas financeiras.

## Fora do escopo desta auditoria

- Troca de e-mail e senha: pertencem ao emissor de identidade (#12/#49).
- Gasto de processamento: decisão do titular de 06/10/2026, PR #71.
- Compressão gzip das leituras: issue API #208, consumidor #37 (PR #105), conduzida em outra sessão.
