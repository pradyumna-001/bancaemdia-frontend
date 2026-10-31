# Coleta — #34

## Fonte e disponibilidade

Backend #204 / [PR #205](https://github.com/pradyumna-001/bancaemdia-api/pull/205), HEAD 0f9b2aec8fa9b47ada6ce18d8382766a22e5469a, adiciona a sessão selecionada a GET `/api/v1/coleta/installations`. Consumidor usa a árvore única reconciliada **86c82c9cd4e9cbb296a6e7991c06a8f3e5f3c7a7**, OpenAPI completo SHA-256 **f486d9af983fcea52a087ec78aefedbfd3e65bdf30bf237a8f5b124a473d1595**, 127 operações. Preserva ec46748 e todas as dependências registradas no pin; não há união manual de schemas. [Spec imutável da API](https://github.com/pradyumna-001/bancaemdia-api/blob/86c82c9cd4e9cbb296a6e7991c06a8f3e5f3c7a7/docs/contracts/coleta-sessoes-web.md).

PR contra main, dependente da frontend #98 e antecedentes, e da backend #205 e fontes do pin. Sandbox permite revisão e ensaio; publicação permanece bloqueada até integração administrativa, novo pin integrado e repetição dos gates. Não faz merge, deploy ou lançamento da extensão.

## Operações e estados

Lista completa do proprietário, inclusive instalações expiradas/revogadas; sem paginação ou filtro de apostas aplicado. Estado privado identificado por epoch/usuário, resposta validada depois do parsing e descartada após troca/logout. GET não toca último uso nem sessão. Sem indicador online: validade da credencial e sessão são eixos independentes.

`sem_sessao` exige objeto null; `aberta` exige seleção atual/sem encerramento; `encerrada` exige última encerrada/data. Fronteira original é exibida com instante ISO exato disponível sob detalhes, preservando microssegundos. Nome ausente e datas null permanecem Não informado. Prefixo é limitado e mascarado. Nenhum token completo entra na listagem.

Código de pareamento usa POST `/coleta/pairing-codes`; só existe no estado local, com cópia por gesto e remoção na expiração/saída/troca/logout. Não pertence a queries, mutations em cache, URL, storage ou telemetria. A criação não troca código automaticamente nem abre instalação/sessão na SPA. O exchange fica com a extensão.

Troca e revogação consultam o estado atual e pedem confirmação com nome e consequência. Escopo de cada pedido é um ID próprio. POST rotate invalida a credencial antiga e exibe a nova uma única vez; expiração registrada não é renovada pela SPA. DELETE exige 204; não encerra sessão, cancela jobs admitidos ou remove apostas. Voltar/Escape restauram foco; resposta de segredo recebe foco. READ_ONLY permite os três controles conforme exceções publicadas; `can/run` revalida antes da mutation, cookie/CSRF e servidor prevalecem.

Nenhuma mutation tem replay automático. Resultado desconhecido exige consulta explícita antes de nova decisão; a consulta não recupera o segredo nem comprova a tentativa. Refazer pareamento na extensão é a orientação para credencial perdida. 429/503 preservam recorte e Retry-After; GET mantém orçamento global de retry. Erro com dados anteriores é identificado como última consulta e bloqueia controles até recuperação. 401 reautentica; 402 não destrói sessão nem transforma gestão de dispositivo em ingestão autorizada.

ACK não é materialização. Links Apostas/Revisão/Enviar preservam contexto. Não há chamada web a sessions/status/catalogo/exchange nem anúncio de compatibilidade por domínio. Captura, leitores, outbox e permissões continuam na extensão/API. Download continua esperando release no repositório responsável.

## Verificação obrigatória

Unidades cobrem projeção incoerente, segredos inválidos/expirados, confirmação, exclusividade do POST, CSRF/READ_ONLY, duas instalações, consulta anterior, resultado perdido, Retry-After, copy/recusa, cache/storage/URL, saída/logout e resposta tardia. Gate de cobertura permanece >=80% por arquivo/quatro métricas.

`tests/e2e/coleta.spec.ts` valida apresentação nos seis projetos existentes: temas, axe, foco/teclado, 320px, navegação com filtros e segredo removido. Fixture de demonstração fica em `tests/fixtures/coleta/`, build `dist-coleta-fixture/`, separado de dist; o build público não aceita sua sessão.

`tests/identity/test_coleta_contract.py` usa build público, OIDC/cookie/CSRF, PostgreSQL/RLS e API reais, dois proprietários e dois dispositivos. Um listener adicional do mesmo aplicativo/ambiente usa TLS real e certificado descartável verificado pelo proxy local; não altera middleware HTTPS nem confia em headers fornecidos pelo browser. O transporte browser/proxy de loopback conserva o harness de identidade existente. Código gerado na UI é trocado pela API real como extensão; abre/encerra/retoma sessão real, re-pareia mesmo UUID e prova fronteira. Gestão em READ_ONLY, 402 distinto, isolamento/404/401, rotação só de um dispositivo, revogação sem encerramento, resposta perdida após commit e quota 429 real sem editar limites/timestamps.

Workflow `coleta-contract.yml` executa seis jornadas (três browsers/dois viewports), inventário exato sem skips, e os 26 aceites obrigatórios de proprietário do backend com checker original. Gates anteriores de identidade, central e entrada são preservados no novo pin. Traces sem rede/snapshots/segredos são sanitizados e verificados antes de upload; screenshots são feitas somente após ocultar credenciais. Este documento descreve o gate; os resultados finais pertencem ao SHA da PR.
