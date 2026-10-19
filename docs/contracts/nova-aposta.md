# Nova aposta — frontend #29

## Fonte e disponibilidade

Backend #202/PR #203 (`b2bb0dfc66e26621d41c064f4690932938b877f5`) publica POST/GET `/api/v1/apostas-manuais/operacoes/{intencao_id}`. O POST antigo não é usado pelo formulário. A capacidade está em PR aberta, sem merge administrativo. Sandbox completo fornecido: `ec46748b00ce97ae3c3cac032f03cc691f7f8908`, sobre `547a4d0`, 127 operações, SHA-256 `797c735e0fa6d63f46c3eb1635e569e434154dfc02fb17d27c940ff339cfcf96`. Módulos próprios de criação, migration e 44 aceites são idênticos entre candidata e sandbox. Head conjunto `u202sandbox2026` preserva `u200sandbox2026` e `m202manual2026`.

Tipos, validadores e política x-idempotency são gerados do mesmo documento inteiro; drift inclui manual.generated.ts. Não unir schemas. Disponibilidade sandbox_reconciliation bloqueia publicação. Dependências frontend #95/#94 e backend #203/#201/#199/#197/#195/#193/#189/#187 declaradas contra main. Depois da integração, reconciliar um único pin integrado e repetir as provas.

## Formulário

`/aposta/nova` é rota protegida da área Apostas, acessível também em Enviar. Nova aposta é gesto explícito que remove só a intenção anterior e preserva filtros; filtros não preenchem o formulário. Casa vem do catálogo real paginado com busca, vazio e recuperação, sem lista fixa. Busca dentro do formulário não cria forms aninhados nem dispara registro.

Casa, odd e unidades são essenciais; detalhes são opcionais. Freebet preserva face positiva em unidades. Dinheiro, lucro, retorno, custo próprio e unidade vigente são da API. Comissão BRL é convertida textualmente apenas em format.ts, com string BIGINT exata e limite PostgreSQL, sem arredondar. Datas pedem offset explícito; ausência de data da aposta delega o relógio à primeira criação do servidor. Textos são preservados.

Matriz da casa informa contas/titulares distintos, incluindo histórico, conta sem titular e encerradas. Não há escolha arbitrária nem edição de vigência. Sem referência explícita, a API resolve pelo dia do jogo ou publica conta ausente/ambígua com referência autorizada à Revisão.

## Identidade e recuperação

UUID manual_intencao é registrado na URL e confirmado pelo roteador antes do POST. Não é segredo nem autorização. Corpo, textos e pedido congelado ficam somente na memória do componente; nunca em cache de queries, URL, storage, history state ou telemetria. Gesto duplo é bloqueado no mesmo frame. FULL_WRITE atual é revalidado; cookie/CSRF e servidor prevalecem. Não há retry automático de mutation/consulta de recibo, polling ou estado assíncrono inventado.

POST 201/200 ou GET 200 validado confirma a chave; só então ocorre navegação ao detalhe atual. A referência pública permite consulta separada da confirmação original em memória, sem cache. Recibo não substitui projeção financeira atual. Avisos originais não afirmam que uma revisão ainda esteja aberta; links levam à referência publicada mantendo filtros.

Timeout, 5xx, resposta inválida, 409 ou interrupção bloqueiam edição/reenvio. Usuário consulta a mesma identidade por GET, permitido em READ_ONLY. 404 não prova rollback. Somente após consulta e novo gesto pode reenviar o UUID/corpo original ainda em memória; API serializa a operação. 410 não libera identidade para recriar. Recarga sem corpo permite só GET, sem reconstruir pedido por listagem/totais ou semelhança.

422 preserva campos e UUID para correção explícita. Nenhuma gravação naquele pedido não é garantia sobre outra tentativa. Campo seguro mapeia labels locais, sem msg/input/ctx/detail arbitrário. Corpo corrigido que encontre confirmação concorrente conflita, sem identidade nova automática. 402 preserva formulário/sessão e pagamento não repete intenção. Retry-After bloqueia até o prazo original. Saída/troca/logout cancelam requests, apagam corpo/recibo e descartam respostas antigas após parsing; recursos privados registram limpeza na sessão.

## Provas e publicação

Unitários: pedido exato, BIGINT, validação de recibo, catálogo/matriz, UUID antes do POST, gesto duplo, recuperação/replay, recarga, 422/402/429/410, respostas atrasadas e limpeza. Fixture só em tests/fixtures/manual, build dist-manual-fixture separado de dist. Browser verifica temas, Axe, teclado/foco, reflow 320px, celular/desktop e rejeição de sessão simulada pelo build público.

CI preserva 48 jornadas anteriores e acrescenta seis manuais nos três browsers, 390×844 e 1440×900: comum com conta/comissão/data, freebet, perda real de resposta após commit, recarga/GET, conta removida entre escolha/POST e 422 real, correção no mesmo UUID, READ_ONLY e isolamento. Acrescenta 44 aceites HTTP/PostgreSQL e checker congelado, sem remover inventários anteriores. Traces começam após autenticação/seed e excluem rede, recursos, resultados e credenciais.

Job central reserva 30 minutos para 54 jornadas e novos 44 aceites. Somente a reserva total do job muda; timeouts de teste/pedido, cobertura por arquivo, budget JS, inventários e zero skips permanecem. Sandbox/demonstração não autorizam deploy ou promoção de contrato.
