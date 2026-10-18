# Metas e fuso — #57

Backend #105/#158 integrado em b916f54331f14cf47a3800324bd61d8638043c06. A árvore completa pinada 5f5f06276114d35e062db45bc54c61c4cb6fc3ec preserva esses endpoints e todos os consumidores anteriores; não atualizar nem unir schemas para esta entrega. Sandbox continua bloqueado para publicação. Frontend depende de #101/#100/#80 e antecedentes, sempre com PR contra main e merge pelo administrador.

## População e apresentação

GET /painel/metas retorna a lista completa privada, inclusive arquivadas. Cada meta tem intervalo próprio de datas civis e usa a população canônica da API, sem filtros de casa/tipster/banca/visibilidade da URL. Preservar esses parâmetros e explicar esse escopo. O filtro de status da lista fica em meta_status; inválido usa todas. Nenhuma lista paginada é filtrada para simular o conjunto.

Métricas publicadas: lucro_centavos, giro_centavos, roi, win_rate e total_apostas. Alvo, linha_base, valor_atual e progresso são strings decimais decididas pela API. A API legada de configuração publica seis casas inclusive nos centavos; formatar exatamente em src/lib/format.ts, sem Number, sem arredondamento ou decisão financeira. A entrada BRL/percentual é conversão textual de unidade nesse mesmo módulo. Razões/progresso podem ser negativos ou exceder um; não truncar a leitura. null não é zero. Status manual e alvo_atingido são informações distintas; linha base igual ao alvo tem progresso null, sem fabricar porcentagem.

Metas são opcionais. Título/métrica/datas/alvo/linha base exigem escolha explícita, sem exemplo financeiro no formulário, objetivo recomendado ou incentivo a apostar mais. Lista compacta mostra período, atual, alvo, linha base, progresso e status com texto/unidades. Novo/editar abre formulário estreito; arquivar exige confirmação com foco inicial em Agora não, Escape devolve o foco. DELETE arquiva e a meta continua consultável. Não reconstruir meta a partir de parâmetros da URL.

## Escritas e incerteza

POST /metas, PATCH/DELETE /metas/{id} revalidam FULL_WRITE com can/run e CSRF. GET permite READ_ONLY. Nenhuma mutation ganha replay automático ou de sessão. Payload/formulário somente em memória, limpeza/aborto na saída/troca/logout, descarte depois do parsing. 402 mantém entradas/sessão/leitura; 422 usa labels locais sem eco de detalhes; 429/503 respeitam Retry-After e GETs seguem os limites existentes.

O POST legado não publica identidade de intenção/consulta de recibo. Resultado desconhecido não permite reenviar o formulário, e GET da lista não prova aplicação nem rollback. Preservar entradas, explicar que a criação pode ter ocorrido, oferecer consulta e fechamento explícito do formulário sem prometer cancelamento. Nova criação exige formulário vazio e novo gesto. PATCH/DELETE desconhecidos também exigem consulta explícita do recurso atual antes de preparar nova edição; GET mostra estado atual, sem afirmar autoria, ordem ou rollback. Não inferir a aplicação pelo título, pelo número de metas ou por comparação financeira. Não inventar chave idempotente ou contrato de revisão.

Reutilizar FusoPreferencia e seu GET/PATCH /painel/preferencias. Confirmação invalida análises; não criar preferência local nem reescrever datas históricas. Fuso das metas não é inferido no cliente a partir do fuso das análises; datas e população são as publicadas.

## Provas

Unidades do protocolo, formatadores, isolamento e ciclos, cobertura >=80% por arquivo nas quatro métricas. Interface 390×844/1440×900, ambos os temas, teclado/foco/Escape e reflow 320, vazio/erro/READ_ONLY. Seis jornadas adicionais com SPA pública/API/emissor/PostgreSQL reais nos três browsers/dois viewports, sem skips: criar/editar/arquivar/consulta, progresso e null autoritativos, fuso, recusa comercial, perda de resposta sem duplicação e isolamento. Preservar todos os inventários/gates anteriores no mesmo pin; traces sanitizados antes do upload. Pronta somente com todos os checks verdes no SHA final, fora de rascunho.
