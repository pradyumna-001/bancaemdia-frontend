# Caixa — movimentos e saldos (#31)

GET/POST `/api/v1/caixa`, GET `/caixa/saldo`, GET `/caixa/extrato` e PATCH `/caixa/contas/{conta_casa_id}/banca` existem na main integrada backend b916f54331f14cf47a3800324bd61d8638043c06. Esta entrega mantém o pin único de sandbox b37a3f88b922b471d25d5f1c92c84b336cd2c9c0 da #27: 120 operações, SHA-256 9da4116cf357df8c1b933c575156c067d8df86b3a216d234d810214a27a02ecb. Descritores gerados do mesmo documento, sem shape manual ou alteração da API. Disponibilidade `sandbox_reconciliation` bloqueia publicação; Revisão #28 é independente.

## Saldos e identidades

Saldo, parte conhecida, em jogo, depósito faltante e componentes vêm da API. Null permanece desconhecido; nenhuma soma local ou zero substituto. JSON com inteiros inseguros é recusado. Capital inicial da banca é separado do saldo das contas; confiabilidade/escopo/saldo da banca são decisões do servidor. `data_corte` é civil. Nova consulta não promete recomputar materializações externas.

Titular/casa/apelido vêm da matriz publicada, incluindo Sem titular. Falha de identificação preserva valores com aviso seguro. Não inferir EM_USO ou permissão de Caixa pelas ações de ativação. Vínculo usa PATCH existente. O cadastro de bancas (criar, editar, arquivar, capital) agora tem contrato e fica nesta tela, na seção Bancas (#122, descrita abaixo); modo conjunta/separada não existe como chave na API e não é inventado.

## Recortes e extrato

URL: `caixa=saldos|movimentos|extrato`, `caixa_conta`, `caixa_titular`, `caixa_tipo`, `caixa_desde`, `caixa_ate`, `caixa_pagina`, `data_corte`. Inválidos usam defaults; dia final convertido para exclusivo no fuso São Paulo. Movimentos aceita conta/titular/tipo/datas; Extrato somente conta/datas. Tipo/titular preservados não são aplicados ao Extrato. Outros filtros permanecem nos links, com escopo explícito. Paginação é da API; não filtrar uma página para simular população.

Uma resposta de escrita preserva o recorte atual, inclusive se alterado durante o envio; só remove sua própria identidade do endereço. Recarga com referência pendente bloqueia também alterações de vínculo até consulta e encerramento explícitos, sem desfazer dinheiro.

Extrato usa discriminador movimento/aposta. A aposta informa data_aposta/criada_em, `liquidada_em:null`; não inventar liquidação ou saldo corrido. Custo/retorno/resultado líquido são recebidos. BONUS só leitura.

## Escrita e recuperação

Depósito, saque, ajuste e transferência exigem escolha explícita e confirmação. Ajuste global é escolha humana. Conversão sinal/centavos somente no formatador central. Transferência é um POST atômico com duas contas; não calcular suas pontas. FULL_WRITE atual revalidado por `useOperacao`; 402 preserva formulário/sessão/leitura sem replay após pagamento.

UUID em `movimento` precede POST/Idempotency-Key; corpo só em memória. Mutation nunca tem retry automático. Resposta perdida exige GET explícito dos movimentos: a lista não identifica intenção nem prova rollback. Com corpo em memória, gesto explícito solicita resposta usando exatamente chave/corpo originais, conforme idempotência da API. Recarga sem corpo apenas consulta/encerra observação, sem reconstruir pedido. Erros seguros e Retry-After preservados.

PATCH vínculo não tem replay: após incerteza, GET saldo sem corte verifica estado atual antes de nova intenção, sem afirmar sucesso da alteração original. GET falho mantém bloqueio. Saída/troca/logout abortam requests, removem corpo/recibo/formulário/queries privadas e descartam respostas antigas após parsing.

## Bancas — #122

Decisão de local (regra 30, delegada pelo titular em 04/11/2026): a gestão de bancas fica dentro de Caixa, na seção “Bancas”, junto dos saldos e do vínculo conta→banca. Contrato: `GET/POST /api/v1/bancas`, `PATCH /api/v1/bancas/{banca_id}`, `POST /api/v1/bancas/{banca_id}/arquivar` e `GET /api/v1/bancas/intencao` do pin (API #215/#211), tipos gerados `BancaSaida`, `BancaNova`, `BancaAlteracao` e `IntencaoSaida`.

Cada banca ativa mostra nome, capital inicial (null é “Não informado”, zero é zero), saldo das contas recebido de `/caixa/saldo` e as contas vinculadas publicadas. Arquivadas ficam sob demanda, com data, e continuam identificáveis; a escolha de banca no vínculo só oferece ativas (e a atual da conta). Nada é somado no cliente.

Criar e editar usam nome (1 a 80 caracteres) e capital em reais, convertido só por `centavosDaEntrada`; em branco é não informado. Editar envia só os campos alterados e capital apagado envia `null`. Arquivar exige confirmação (foco em “Agora não”, Escape devolve o foco) e fica indisponível enquanto houver conta vinculada; o servidor decide e responde `banca_com_contas`.

A `Idempotency-Key` vai para a URL (`banca_intencao`) antes do pedido; o corpo fica só em memória e não há replay automático. Incerteza bloqueia novas alterações até “Consultar resultado” (GET da intenção com a mesma chave), que confirma só com a resposta original da mesma operação; após recarga sem corpo, a operação vem da própria API. 404 não prova rollback: com o pedido em memória é possível reenviar a mesma chave e o mesmo corpo por gesto; sem ele, só descartar. Recusas conhecidas (`nome_em_uso`, `banca_arquivada`, `banca_com_contas`, `banca_nao_encontrada`) têm texto próprio, liberam a chave e mantêm o formulário; a 422 `banca_invalida` aponta o campo pelo rótulo local. O 409 `banca_arquivada` no vínculo conta→banca é recusa conhecida: nada muda, a mensagem explica e as escolhas são relidas, sem exigir consulta de resultado incerto. READ_ONLY consulta tudo e bloqueia criar, editar e arquivar.

Provas: protocolo, seção e hook (listas, capital nulo, criação com chave prévia na URL, conversão e validação local, edição parcial, arquivamento com confirmação, nome em uso, perda com consulta, 404 com reenvio, recarga só com a chave, consulta falha, 422 por campo, READ_ONLY, logout), vínculo com banca arquivada no Caixa, E2E com fixture e jornada real `tests/identity/test_bancas_contract.py` (workflow “E2E bancas com API real”), três browsers × dois viewports, zero skips: criação com capital, perda da resposta do PATCH com recarga e consulta da intenção sem novo envio, conta vinculada bloqueando o arquivamento, arquivamento confirmado, 409 do vínculo com banca arquivada, dois temas, axe, 320 px, isolamento e READ_ONLY.

## Verificação e integração

Fixture em `tests/fixtures/caixa/`, build separado `dist-caixa-fixture`; público rejeita sessão simulada. Testes cobrem precisão/null, discriminação, confirmação/atomicidade, idempotência/perda de resposta, 402/422/429/503, filtros/vínculo/limpeza/leitura. Axe, temas, teclado e reflow nos dois viewports.

CI preserva inventários anteriores e acrescenta seis jornadas SPA pública/emissor/API/PostgreSQL reais (3 browsers × 390×844/1440×900): depósito, transferência, perda de resposta após commit, replay sem duplicação, vínculo, recorte, contas distintas, outro usuário, trial expirado/402 e logout. Checker recusa omissão/duplicação/skips. Traces começam após autenticação/seed e são sanitizados sem rede/recursos/segredos. Status da execução consta na PR; especificação não é prova aprovada.

PR independente contra main declara frontend #92 e sandbox herdado (#184/#187/#189/#193/#195/#197/#199); merge com administrador. Reconciliar versão integrada, gerar todos os artefatos e repetir provas antes de publicar.
