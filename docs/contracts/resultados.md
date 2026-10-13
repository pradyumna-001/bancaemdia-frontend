# Resultados — fila, um toque e desfazer (#27)

API candidata [#199](https://github.com/pradyumna-001/bancaemdia-api/pull/199), issue #198, SHA `a67920f1aa6f77de1fd34c6b142c3e611f584502`, com 27 checks aprovados. Main backend `b916f54` ainda não contém o contrato. O sandbox real único `ac8a2d86865c374f2b868f3cc04e9483cdff1a38` reconcilia o código próprio dessa candidata com 003d3a0, preservando as entregas anteriores. Migração de Resultados sucede s196preview2026 nesta árvore de prova; o administrador reconcilia as cabeças ao integrar. Nenhum merge administrativo foi feito.

OpenAPI inteiro gerado pelo app: 120 operações, SHA-256 `9da4116cf357df8c1b933c575156c067d8df86b3a216d234d810214a27a02ecb`. Tipos, descritores, políticas de upload/idempotência e `x-bancaemdia-resultados` vêm desse mesmo documento. A disponibilidade continua `sandbox_reconciliation` e bloqueia publicação. Não juntar schemas nem substituir o pin pelos 94 endpoints da candidata isolada.

## Fila e recorte

GET `/api/v1/resultados/fila` usa o primário e keyset com fronteira de inserções, cursor privado de 30 minutos e páginas de 50. Não existe offset ou teto de 10 mil. A ordem global da API segue data_jogo crescente, fallback criada_em, desempate por identidade; data_aposta não define antiguidade. O cliente recebe `criterio_antiguidade`, sem inferência ou ordenação local.

Filtros compatíveis usam o endereço e o adapter gerado: casa/titular/conta/banca/tipster/mercado/competição/origem e datas sobre antiguidade. Dias civis são convertidos pela política de datas existente, de inclusivo/até exclusivo. IDs não representáveis sem perda são recusados explicitamente. Grupo, outras visibilidades, outros estados, revisão grave e períodos abreviados não são aplicados silenciosamente: ficam na URL e bloqueiam consulta até remoção explícita. PENDENTE, ativas e sem revisão são o escopo da operação. Os links mantêm os parâmetros.

Só entram pendentes selecionadas, financeiras canônicas, atribuídas e sem revisão grave. Fonte contextual consolidada, sem conta ou apagada tem decisão de elegibilidade da API. Revisão e Apostas são destinos para conferir os itens fora da fila. Não filtrar uma página para simular uma população diferente.

Páginas fazem upsert por chave, preservando a ordem recebida; só retiram confirmações reais consumidas na fronteira atual. Reiniciar a fila limpa esse consumo e confia na elegibilidade atual da API, inclusive se outra origem devolveu uma aposta para PENDENTE. Liquidar uma linha não faz o cursor pular a próxima. Novas apostas e alterações de data/atribuição exigem nova fila. Cada resposta é um snapshot: “pendentes na última consulta” é o total publicado, sem decremento local. “Confirmados nesta sessão” conta recibos efetivos, excluindo reversões confirmadas. Não existe lucro/ROI agregado calculado no site; os valores por aposta vêm da API. Null não é zero; inteiros inseguros são recusados.

## Registrar e desfazer

GREEN/RED geram uma intenção UUID e POST `/operacoes/{intention_id}` com chave/revisão esperada/estado. Identidade vai ao endereço antes do POST; revisão e corpo ficam em memória. São 20 gestos para 20 resultados, sem confirmação extra ou reload. A aposta atual mantém seu alvo enquanto o pedido está em andamento. Duplo clique não muda alvo e há separação de 300 ms antes de habilitar o gesto seguinte. Foco passa depois da habilitação; leitor de tela recebe a confirmação.

Outro abre picker próprio para ANULADA/CASHOUT/MEIO_GREEN/MEIO_RED. Cashout recebe o pago obrigatório; retorno e comissão opcionais da casa são entradas humanas formatadas pelo conversor único. O site não calcula retornos ou freebets. Escritas revalidam FULL_WRITE pela #52; 402 preserva formulário, sessão e leitura, sem repetição após pagamento.

Recibos guardam a resposta financeira confirmada, não afirmam o estado atual após alteração externa. Desfazer cria UUID novo e POST `/operacoes/{id}/desfazer` com ID e revisão da operação alvo. Pré-imagem, validade de 24h e reversão são decisões do servidor. A API verifica todos os escritores, incluindo resultado legado, Coleta, importação, revisão e consolidação; estado nominal igual não evita conflito. Uma reversão antiga não sobrescreve alterações posteriores. Consultar estado atual após conflito reinicia a fila; reversão cuja revisão mudou fica indisponível na apresentação.

## Recuperação e memória

Nenhum POST é repetido automaticamente. Após resposta desconhecida, GET `/operacoes/{id}` consulta a mesma identidade; recibo 200 instala a confirmação, 404/410 não provam rollback. Com o corpo ainda em memória e após GET 404, há gesto explícito para reenviar exatamente UUID/payload, conforme idempotência do servidor. Recarga sem corpo apenas consulta. Conflito/recusa definida exige GET da aposta atual antes de nova intenção; dinheiro nunca é restaurado pelo cliente.

Cursores, revisões, corpos e histórico de desfazer ficam em memória, sem storage/telemetria. Saída, mudança de recorte, troca de usuário e logout abortam requests e limpam fila/recibos/payloads; respostas tardias são descartadas inclusive após parsing. Somente UUID não secreto da intenção pode permanecer no endereço para recuperação, sem autorizar escrita. GETs mantêm retry limitado e Retry-After; mutations não têm retry de sessão.

## Provas

Fixture de apresentação somente em `tests/fixtures/resultados/`, build `dist-resultados-fixture` separado do público. Testes de componentes cobrem 20 gestos/keyset, duplo toque, foco, picker, cashout, reversão, resposta perdida/replay explícito, conflitos, 402/422/503/READ_ONLY e descarte de memória.

CI mantém todos os inventários anteriores e acrescenta 70 casos API/PostgreSQL obrigatórios e seis jornadas com SPA pública, emissor, API e PostgreSQL reais: Chromium/Firefox/WebKit, 390×844 e 1440×900. Provas: 53 itens e segunda página após liquidações, 20 gestos/20 operações, desfazer válido, desconexão real após commit/GET de recibo, escritor legado intermediário impedindo reversão, 402, outro usuário e logout. Checkers recusam omissão/duplicação/skips; traces começam após autenticação/seed e excluem segredos/rede. Event Timing em Chromium mede interações (<200 ms no ensaio), com resolução mínima de 16 ms; não é certificação de INP de produção. Axe, temas, teclado, alvos 48px e reflow 320px complementam a prova.

Após alterações ou integração administrativa: reconciliar código/migrações numa única referência integrada, gerar novamente o documento inteiro, atualizar pin e executar todas as provas. PR frontend contra main declara #91 e #199 como dependências, identifica o escopo herdado e continua sem autorização de deploy.

Revisão de integração: seletores/catálogos só montam ao abrir Filtros. GET de reconciliação respeita seu próprio Retry-After, sem herdar a pausa do POST; 429/503/result_busy preservam o bloqueio das gravações mesmo após consulta. O cadastro XLSX mantém ações bloqueadas até concluir a invalidação da lista de fontes, fechando a janela entre a mutation e seu processamento externo. Teste de rollback de prints usa a cabeça atual r198, sem remover a recusa de downgrade populated.
