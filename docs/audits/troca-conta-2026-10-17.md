# Troca de conta (#53): confirmação da prévia

Auditoria estática de 17/10/2026. A #53 é a próxima capacidade pendente que antecede o E2E completo #36. Não foi implementada uma tela nem declarado um PR frontend pronto. A correção abaixo pertence à API; a interface permanece responsabilidade do frontend.

## Versões conferidas

- Main backend confirmada pelo GitHub: `b916f54331f14cf47a3800324bd61d8638043c06`. As PRs #136 e #177 estão integradas. O texto antigo da #53 que descrevia toda a troca como apenas em PR estava desatualizado.
- Pin atual do consumidor: `86c82c9cd4e9cbb296a6e7991c06a8f3e5f3c7a7`, OpenAPI de 127 operações, SHA-256 `f486d9af983fcea52a087ec78aefedbfd3e65bdf30bf237a8f5b124a473d1595`. Disponibilidade `sandbox_reconciliation`, sem autorização de produção.
- `src/bancaemdia/domain/titulares.py` tem o mesmo blob nas duas versões. A última alteração nesse arquivo é `3ac0e924df3e2eba14dbedaf1931d584aa62fa26`.
- PRs abertas #184/#185/#187/#189/#191/#193/#195/#197/#199/#201/#203/#205 e issues abertas da API foram conferidas. Nenhuma entrega uma confirmação condicionada à evidência da prévia de troca.

## O que já existe

POST `/api/v1/titulares/trocas/preview` e `/trocas` recebem `TrocaContaEntrada` e a mesma `Idempotency-Key`. Há isolamento por usuário, validação de casa/origem/destino/instante/estado, serialização transacional, preservação do histórico e recibos persistidos por PREVIEW/APPLY. Repetir o mesmo tipo/chave/corpo retorna a resposta armazenada; outro corpo conflita. Não é necessário reimplementar o motor temporal ou inventar atribuição no navegador.

A matriz publica `TROCAR_DE` e `TROCAR_PARA`. A resposta da prévia contém `apostas_afetadas_ids`. O código exclui atribuições explícitas e usa o dia do jogo. Os testes existentes provam a fronteira temporal, a repetição concorrente e a preservação de apostas anteriores.

## Lacuna de confirmação

`_digest` cobre somente casa, origem, destino, instante e estado escolhido. Na aplicação, `trocar_conta` exige uma PREVIEW com o mesmo hash do pedido. Depois consulta novamente as apostas e suas projeções, monta outra lista de impactos e grava APPLY sem comparar essa evidência com a resposta PREVIEW persistida.

Exemplo deduzido desse caminho: a prévia retorna a aposta A; antes da confirmação, uma importação insere B elegível, com data do jogo posterior ao instante da troca. Origem e destino continuam válidos. A aplicação recalcula A+B e prossegue com a mesma chave, embora o usuário tenha visto apenas A. Uma correção de data/atribuição também pode alterar a população entre os pedidos. As travas serializam cada pedido; não comprovam que o que foi apresentado continua igual no pedido seguinte.

Repetir PREVIEW com a mesma chave retorna a resposta antiga, portanto não atualiza a evidência. Comparar a resposta de APPLY no cliente é tarde: a transação já foi confirmada. Refazer PREVIEW antes de APPLY ainda deixa uma janela entre pedidos. Nenhuma dessas soluções satisfaz a task da #53 de tratar mudança entre prévia e aplicação com nova confirmação.

Este é um resultado de leitura de código/contrato, não de um ensaio HTTP/PostgreSQL executado nesta auditoria. A reprodução real do caso e sua regressão são requisitos da correção solicitada.

## Correção mínima solicitada

O servidor deve vincular a confirmação à evidência da prévia e recusar atomicamente a aplicação se o impacto ou contexto relevante mudar. Pode comparar uma representação canônica persistida ou publicar uma revisão opaca; a decisão é da API. A proteção precisa abranger os escritores que alteram a evidência, não apenas duas trocas concorrentes. Nova prévia exige uma nova confirmação humana; uma chave antiga não pode atualizar silenciosamente o que já foi confirmado.

Preservar replay de APPLY já confirmado com a mesma identidade e corpo, mesmo após alterações posteriores. Documentar recuperação após resposta perdida, retenção, expiração, erros e permissões. Um GET de matriz não é recibo da intenção. Se houver consulta por identidade, usar a mesma identidade previamente conhecida e permitir sua leitura em READ_ONLY. Não exigir endpoint novo por conveniência se o protocolo existente puder atender de forma segura e documentada.

Esclarecer o significado de `apostas_afetadas_ids`: hoje a troca altera vigências/estados, preserva `conta_casa_id` das apostas existentes e não escreve automaticamente uma correção nessas apostas. A UI precisa distinguir consequência temporal, atribuição explícita preservada e eventual revisão, sem prometer migração que a API não executa. Não ampliar esta emergência para recalcular dinheiro ou trocar o modelo de atribuição.

Provas HTTP/PostgreSQL obrigatórias: mudança de impacto entre prévia/confirmação; mudança por correção/materialização; conflito sem efeitos parciais; nova prévia com nova confirmação; repetição e concorrência da mesma intenção; mesmo UUID com outro corpo; resposta perdida após commit; fronteira T; aposta anterior/aberta e conta explícita; isolamento/RLS; 401/402/CSRF. Zero skips nos aceites obrigatórios.

## Continuação

Branch local `feat/53-troca-conta` preserva frontend #99 e seus antecedentes; a PR futura será contra main, com dependências declaradas e escopo próprio separado do código herdado. Não há merge administrativo nem mudança do pin nesta auditoria. Issue/PR emergencial backend ainda a criar pelo chat responsável; o prompt está preparado para encaminhamento.

Após a entrega, reconciliar uma única árvore real que preserve o pin atual, gerar OpenAPI inteiro pelo aplicativo, fixar commit/hash e provar a SPA nos três navegadores e dois viewports. A #53 continua aguardando a correção; #36 depende também de #56/#57/#59 e do lançamento verificável da extensão na #35.

Fontes imutáveis: [domínio da troca](https://github.com/pradyumna-001/bancaemdia-api/blob/b916f54331f14cf47a3800324bd61d8638043c06/src/bancaemdia/domain/titulares.py), [rotas/tipos](https://github.com/pradyumna-001/bancaemdia-api/blob/b916f54331f14cf47a3800324bd61d8638043c06/src/bancaemdia/api/v1/titulares.py), [testes de troca](https://github.com/pradyumna-001/bancaemdia-api/blob/b916f54331f14cf47a3800324bd61d8638043c06/tests/integration/test_troca_titular.py), [atribuição temporal](https://github.com/pradyumna-001/bancaemdia-api/blob/b916f54331f14cf47a3800324bd61d8638043c06/tests/integration/test_game_account_attribution.py).
