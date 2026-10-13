# Planilha — prévia, colunas e confirmação (#26)

Contrato candidato da PR backend [#197](https://github.com/pradyumna-001/bancaemdia-api/pull/197), issue #196, commit `2140bdabb21835e3c66487c4fe532b09fadebe0b`. Main auditada `b916f54331f14cf47a3800324bd61d8638043c06` não contém o fluxo. A árvore real reconciliada `003d3a0782cca071eaa0db4e8ce66fed2811a7ac` incorpora o sandbox anterior cf20de6 e o código próprio da #197. OpenAPI gerado pelo aplicativo: 115 operações, SHA-256 `c28137d18b64db1a7d3663159f15ee3d6a456abf9d6b8c25776b9f68050301de`. Tipos, políticas e descritores usam esse único documento. Sem união de schemas. Publicação bloqueada até integração administrativa e revalidação.

## Fluxo e identidade

Enviar → Planilha cadastra/seleciona fonte por PUT/GET `/planilhas/fontes/{source_id}` e consulta catálogo `/planilhas/campos`. UUID da fonte vai à URL antes do PUT; nome é apenas rótulo. A API decide `origem_id` estável, versão e prévia atual. Fontes/linhas paginam via URL, preservando filtros e seção; filtros de Apostas não são anunciados como filtros destas leituras.

XLSX multipart, campo `arquivo`, POST `/fontes/{source_id}/previas/{preview_id}` retorna 201 síncrono. Não chama `/apostas/importar-planilha`, não cria job, não escreve apostas na prévia. Cada `linha_id` estável identifica a aposta; renomear arquivo/aba ou reordenar não muda a origem. Arquivos legados por número de linha exigem reconciliação administrativa antes de cadastrar outra fonte para o mesmo histórico. Remover linhas não apaga apostas.

GET `/previas/{preview_id}` e `/linhas` apresentam ready/invalid/obsolete reais, contagens de toda a aba e linhas paginadas, erros por campo com mensagens locais e dados originais. Valores monetários são da API e passam pelo formatador único; null continua desconhecido. Face/custo de freebet não são recalculados. Mapear campo → coluna de base 1 usa picker próprio; mudar aba/colunas bloqueia confirmação até POST `/remapear/{new_preview_id}` com revisão anterior. Cabeçalhos repetidos continuam distinguíveis pelo índice. Não há edição de células no contrato: editar XLSX e gerar nova prévia na mesma fonte.

POST `/confirmacoes/{confirmation_id}` envia somente `preview_id` e `preview_hash`; consulta explícita antes da primeira escrita confere a referência, e o servidor decide permissão, obsolescência, atomicidade e materialização. Alterações concorrentes exigem nova prévia. Resultado durável mostra criadas/atualizadas/ignoradas e links para apostas/Revisão. Resumos materializados têm frescor eventual; GET/refetch não força sua atualização.

## Recuperação e privacidade

UUIDs de fonte/prévia/confirmação são identificadores, não autorização, e precedem mutations na URL. Arquivo, nome, células e mapeamento não são persistidos em storage/URL/telemetria. Queries guardam apenas respostas privadas da API e são limpas na saída/troca/logout; bytes locais e intenção pendente ficam em memória do componente. Requests abortam e respostas tardias são descartadas pelo escopo de sessão.

Sem replay automático de PUT/POST. Resultado desconhecido exige GET da mesma identidade; 404 não prova rollback. Com payload original ainda em memória, gesto explícito permite o mesmo pedido/UUID, sob o contrato idempotente do servidor; recarga apenas consulta. 409/410 exigem conferir antes de continuar. 402 preserva sessão/leitura e não reexecuta após pagamento. GETs respeitam limites de retry/Retry-After; mutations exigem FULL_WRITE revalidado, inclusive preparar prévia e remapear. Nenhum custo/estimativa/aprovação de gasto na tela.

Encerrar explicitamente a consulta remove a prévia/confirmação da URL e o payload local, preservando fonte/filtros. Não cancela nem desfaz o pedido já enviado, não indica rollback e não reenvia dados. Essa saída permite escolher outro arquivo após expiração sem criar fonte diferente para o mesmo histórico.

## Provas

Testes de componentes cobrem fonte estável, multipart, coluna/aba, obsolescência, paginação, confirmação exata, resposta perdida, 404 e gesto explícito, 402/409/410/422/429/503, READ_ONLY, respostas incompatíveis e descarte após saída. Fixture visual em `tests/fixtures/planilha/` tem build separado; prova negativa usa `dist` público contra seu endereço.

CI preserva jornadas existentes, acrescenta 51 casos obrigatórios backend com PostgreSQL e seis jornadas públicas XLSX (Chromium/Firefox/WebKit, 390×844 e 1440×900), inventário exato e zero skips. Essas jornadas demonstram prévia sem gravação, remapeamento inválido/correção, confirmação, recarga GET e reimportação sem duplicação na mesma fonte. Traces começam após autenticação/seed, sem rede/recursos/segredos. Axe, teclado, temas e reflow 320px complementam a prova real. Sandbox não é deploy.
