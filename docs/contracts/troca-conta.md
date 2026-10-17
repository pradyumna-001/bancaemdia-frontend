# Troca de conta — #53

Retomada em 17/10/2026 após backend #206/PR #207. A auditoria anterior é histórica: a confirmação atômica e a consulta de intenção foram entregues no candidato 132ee91585db41494b1c33c0ae499a77007ee16e, com 26 checks verdes conferidos. Consumir a árvore real completa 5f5f06276114d35e062db45bc54c61c4cb6fc3ec, 128 operações, SHA-256 922f9d278a650fa047eb4dcfb933712d25bab9a529ca6bb881dfc6daf8ca108d. Preservar todas as fontes, disponibilidade sandbox_reconciliation e bloqueio de publicação; main permanece b916f54. Merge pelo administrador.

## Tela e confirmação

Destino secundário /contas/trocar, acessível pela matriz e mantendo filtros. Formulário estreito, uma tarefa por etapa: casa → origem/destino elegíveis pelas ações TROCAR_DE/TROCAR_PARA → data com picker próprio, hora e deslocamento explícitos → estado final da origem, sem escolha implícita. A prévia mostra contas, instante normalizado, estado escolhido e IDs recebidos para revisão. Confirmar é um gesto separado. Data futura e elegibilidade são decisões finais da API.

Apostas anteriores, inclusive abertas, permanecem atribuídas à conta original. Os IDs da prévia são candidatos à revisão retrospectiva: a troca não migra apostas, não corrige em lote e não altera dinheiro. Oferecer acesso à lista no recorte preservado, sem inventar chave de aposta a partir do ID numérico. Sucesso invalida matrizes, atribuições, listas e agregados pertinentes, sem prometer refresh de MV.

Verificar 390×844, 1440×900 e reflow 320, ambos os temas, teclado/foco, vazio, carregamento, erro, confirmação, sucesso e leitura. Pickers acessíveis existentes, labels persistentes, cores somente em tokens, números tabulares, confirmação com foco e Escape. Prévia nunca confirma automaticamente.

## Intenção e incerteza

Tipos e validação estrutural vêm exclusivamente do pin. Os dois POSTs exigem FULL_WRITE revalidado, cookie/CSRF e a mesma Idempotency-Key/corpo congelado. Nenhuma mutation ganha replay automático. UUID não é segredo nem autorização. Em conformidade com a API, não colocá-lo na URL nem em logs. UUID, corpo, prévia e recibo permanecem somente em memória; nenhum storage guarda a intenção. Oferecer o código copiável por gesto para consulta manual após recarga; sem o código anterior, a tela não promete recuperar a intenção. Nunca copiar automaticamente. A sessão registra limpeza e aborto do componente; a saída remove seu estado.

GET /titulares/trocas/intencao envia a mesma chave no header e permite READ_ONLY. APPLIED com recibo é prova; PREVIEW/EXPIRED/404/410 não comprovam rollback nem ausência de pedido em voo. Recarga sem corpo autoriza somente consulta, nunca reconstrução/reenvio. Após incerteza, exigir GET explícito antes de permitir gesto de reenvio da mesma chave/corpo previamente confirmado. Não liberar nova identidade enquanto houver escrita desconhecida. 409 stale e 410 expired permitem nova intenção somente quando não houver incerteza pendente; obter nova prévia e pedir nova confirmação. Prévia antiga não é atualizada pela repetição da mesma chave.

Erros seguros em português; 401 reautentica, 402 mantém formulário/sessão/leitura, 422 não ecoa input, 429/503 respeitam Retry-After. Abortar ao sair/trocar/logout e descartar respostas antigas inclusive após parsing. A confirmação de resultado não usa GET de matriz. Fonte imutável: docs/contracts/troca-confirmacao.md no candidato backend.

## Provas exigidas

Unidades para protocolo/isolamento/identidade/estados; interface nos seis projetos sem skips; API/PostgreSQL/identidade reais para a confirmação, concorrência e recuperação, mais os 34 aceites congelados da API e todos os inventários anteriores. Traces sanitizados antes de upload. Atualizar contrato, manifesto e issue remota. PR contra main, dependente da frontend #100 e backend #207/fontes completas; escopo próprio separado do herdado. Pronta somente com todos os checks verdes no SHA final.
