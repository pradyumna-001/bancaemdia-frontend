# Caixa — movimentos e saldos (#31)

GET/POST `/api/v1/caixa`, GET `/caixa/saldo`, GET `/caixa/extrato` e PATCH `/caixa/contas/{conta_casa_id}/banca` existem na main integrada backend b916f54331f14cf47a3800324bd61d8638043c06. Esta entrega mantém o pin único de sandbox b37a3f88b922b471d25d5f1c92c84b336cd2c9c0 da #27: 120 operações, SHA-256 9da4116cf357df8c1b933c575156c067d8df86b3a216d234d810214a27a02ecb. Descritores gerados do mesmo documento, sem shape manual ou alteração da API. Disponibilidade `sandbox_reconciliation` bloqueia publicação; Revisão #28 é independente.

## Saldos e identidades

Saldo, parte conhecida, em jogo, depósito faltante e componentes vêm da API. Null permanece desconhecido; nenhuma soma local ou zero substituto. JSON com inteiros inseguros é recusado. Capital inicial da banca é separado do saldo das contas; confiabilidade/escopo/saldo da banca são decisões do servidor. `data_corte` é civil. Nova consulta não promete recomputar materializações externas.

Titular/casa/apelido vêm da matriz publicada, incluindo Sem titular. Falha de identificação preserva valores com aviso seguro. Não inferir EM_USO ou permissão de Caixa pelas ações de ativação. Vínculo usa PATCH existente; CRUD/capital/modo de banca continuam na #50 sem formulário fictício.

## Recortes e extrato

URL: `caixa=saldos|movimentos|extrato`, `caixa_conta`, `caixa_titular`, `caixa_tipo`, `caixa_desde`, `caixa_ate`, `caixa_pagina`, `data_corte`. Inválidos usam defaults; dia final convertido para exclusivo no fuso São Paulo. Movimentos aceita conta/titular/tipo/datas; Extrato somente conta/datas. Tipo/titular preservados não são aplicados ao Extrato. Outros filtros permanecem nos links, com escopo explícito. Paginação é da API; não filtrar uma página para simular população.

Uma resposta de escrita preserva o recorte atual, inclusive se alterado durante o envio; só remove sua própria identidade do endereço. Recarga com referência pendente bloqueia também alterações de vínculo até consulta e encerramento explícitos, sem desfazer dinheiro.

Extrato usa discriminador movimento/aposta. A aposta informa data_aposta/criada_em, `liquidada_em:null`; não inventar liquidação ou saldo corrido. Custo/retorno/resultado líquido são recebidos. BONUS só leitura.

## Escrita e recuperação

Depósito, saque, ajuste e transferência exigem escolha explícita e confirmação. Ajuste global é escolha humana. Conversão sinal/centavos somente no formatador central. Transferência é um POST atômico com duas contas; não calcular suas pontas. FULL_WRITE atual revalidado por `useOperacao`; 402 preserva formulário/sessão/leitura sem replay após pagamento.

UUID em `movimento` precede POST/Idempotency-Key; corpo só em memória. Mutation nunca tem retry automático. Resposta perdida exige GET explícito dos movimentos: a lista não identifica intenção nem prova rollback. Com corpo em memória, gesto explícito solicita resposta usando exatamente chave/corpo originais, conforme idempotência da API. Recarga sem corpo apenas consulta/encerra observação, sem reconstruir pedido. Erros seguros e Retry-After preservados.

PATCH vínculo não tem replay: após incerteza, GET saldo sem corte verifica estado atual antes de nova intenção, sem afirmar sucesso da alteração original. GET falho mantém bloqueio. Saída/troca/logout abortam requests, removem corpo/recibo/formulário/queries privadas e descartam respostas antigas após parsing.

## Verificação e integração

Fixture em `tests/fixtures/caixa/`, build separado `dist-caixa-fixture`; público rejeita sessão simulada. Testes cobrem precisão/null, discriminação, confirmação/atomicidade, idempotência/perda de resposta, 402/422/429/503, filtros/vínculo/limpeza/leitura. Axe, temas, teclado e reflow nos dois viewports.

CI preserva inventários anteriores e acrescenta seis jornadas SPA pública/emissor/API/PostgreSQL reais (3 browsers × 390×844/1440×900): depósito, transferência, perda de resposta após commit, replay sem duplicação, vínculo, recorte, contas distintas, outro usuário, trial expirado/402 e logout. Checker recusa omissão/duplicação/skips. Traces começam após autenticação/seed e são sanitizados sem rede/recursos/segredos. Status da execução consta na PR; especificação não é prova aprovada.

PR independente contra main declara frontend #92 e sandbox herdado (#184/#187/#189/#193/#195/#197/#199); merge com administrador. Reconciliar versão integrada, gerar todos os artefatos e repetir provas antes de publicar.
