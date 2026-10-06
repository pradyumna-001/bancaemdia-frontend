# Erros e recuperação — #10

Base: [cliente tipado](cliente-api.md), [ADR005](../adrs/005-errors-timeouts-retry.md), OpenAPI integrado `bd055417459f796fed960b5b37efb33a9744419f`. Esta entrega oferece política de recuperação e componente reutilizável; as telas de domínio ainda são consumidoras futuras. Identidade/billing em PR separado não viram contrato integrado por meio de um teste.

## Decisão e próxima ação

`recuperacaoErro(error, intent, conflict?)` recebe intenção explícita (`leitura` ou `gravacao`), sem inferir permissão comercial pelo verbo HTTP. Não faz login, logout, refresh, navegação ou reenvio. `ErroApi` renderiza mensagens locais em português e callbacks fornecidos pela consumidora.

| Falha                              | Ação                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401                                | Entrar novamente. Callback de identidade será integrado na #11; fallback abre `/login` em outra aba, com `destinoInterno`, mantendo o formulário na aba original.                                                 |
| 402                                | Ver Assinatura em outra aba, sem logout ou reenvio após pagamento. Leitura/exportação continuam independentes; a matriz por operação é #52. O teste de 402 não comprova billing publicado.                        |
| 409 conhecido                      | Contexto comprovado pode pedir consultar estado, refazer prévia ou conferir a intenção idempotente. Callbacks dessas ações observam; não confirmam/gravam automaticamente.                                        |
| 409 sem motivo comprovado          | Revisar/conferir resultado. A main pode retornar 409 por mais de um motivo no mesmo endpoint, inclusive Caixa. Não interpretar `detail` nem assumir que recarregar resolve. Não criar código de conflito ausente. |
| 413                                | Reduzir/trocar arquivo e revisar; sem inventar limite numérico não publicado.                                                                                                                                     |
| 400/422                            | Rever dados/campos, mantendo entrada e filtros.                                                                                                                                                                   |
| 403/404/405                        | Explicar indisponibilidade sem revelar dados de terceiros; a consumidora fornece retorno/revisão contextual.                                                                                                      |
| 429/503                            | Leituras seguras têm tentativas limitadas e prazo por recurso.                                                                                                                                                    |
| Escrita com resultado desconhecido | Conferir resultado; não oferecer reenvio como recuperação automática.                                                                                                                                             |

Formulários controlados permanecem montados durante a recuperação da mesma identidade. Troca de usuário/sessão deve descartar entrada e dados privados conforme AGENTS.md/#11; preservar um formulário após 401 não autoriza levá-lo para outra conta. A consumidora fornece `actions.revisar` para voltar ao campo/contexto e callbacks de leitura para `conferir`/`recarregar`; essas ações não devem usar mutation. Um GET após timeout, sozinho, não prova que a gravação falhou. Reconciliar pelo contrato da operação; sem identificador/contrato suficiente, manter resultado desconhecido. Idempotência da #9 continua com a mesma chave/corpo onde publicada.

## Validação e URL

`ApiError.invalidFields` é uma projeção mínima de `ValidationIssueResponse.loc`: somente escopo `body|query` e identificador do primeiro campo, deduplicados e limitados. Não guarda `input`, `msg`, `ctx`, corpo, trace ou valores enviados. `ErroApi.fields` mapeia nomes locais conhecidos para IDs/labels; campos não mapeados não aparecem como texto cru. A consumidora marca `aria-invalid` e associa uma descrição existente. O resumo focável anuncia o erro, permite focar campos e não retoma o foco a cada atualização do mesmo aviso.

`paginacaoConsulta(operation, URLSearchParams)` normaliza sintaxe conhecida antes da API: page/page_size duplicados, vazios, não inteiros, negativos, fora dos limites ou sem representação exata caem no default publicado. `PAGINATION_RULES` é gerado do mesmo OpenAPI verificado que os tipos, com limites restringidos à representação inteira exata de JavaScript. A CI verifica drift desse arquivo também. Não altera a URL recebida nem remove filtros válidos depois de um 422.

Adapters de estado, período e dimensões específicas pertencem à #17. Esta main publica estado/origem como strings; não inventar enum/fallback para apagar um valor que o serviço recusou. Uma opção sem contrato deve explicar sua indisponibilidade na consumidora, conforme #50.

## Tentativas e prazo

Somente GETs seguros entram em queries. Padrão do QueryClient: HTTP500 até uma tentativa extra, 503 até três, 429 até duas; rede/timeout de leitura até uma. Cancelamento, JSON inválido, erros de acesso/validação/conflito e qualquer `outcomeUnknown` não são repetidos. Mutations mantêm `retry: false` para todos os status. A [configuração de retries do TanStack](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries) usa contagem iniciada em zero; testes executam chamadas reais por MSW para verificar o limite, não só a função de decisão.

O atraso é o maior entre backoff com jitter limitado (teto 30s) e Retry-After já interpretado pela #9. Prazo maior que 60s encerra a tentativa automática, sem truncá-lo para chamar antes. `useRetryAfter(error)` permite bloquear todos os disparadores do recurso afetado, inclusive a tentativa manual, até o prazo. Timers longos são segmentados e limpos no unmount/troca de erro. Revisão de formulário/filtro e consulta de outro recurso permanecem livres. `ErroApi` bloqueia somente a ação de tentar novamente; conferir uma escrita incerta pode consultar um recurso independente.

Ao passar AbortSignal ao cliente, cancelamento de query interrompe observação. Não usar isso para afirmar que um job ou gravação foi cancelado remotamente. Não adicionar retry por cima do QueryClient nem refetch infinito para esconder um erro persistente.

## Verificação e disponibilidade

Testes de unidade/MSW cobrem prazos e número de chamadas, leitura independente, 401/402, 409 contextual/conservador, 413/422, filtro recusado, campo sem payload privado, rede e timeout após envio, sem reenvio de escrita. E2E exercita o componente em build separado `dist-shell-fixture`, nos três browsers/dois viewports do CI, com Axe, foco, temas Claro/Escuro e reflow 320px. Capturas `recuperacao-Claro.png`/`recuperacao-Escuro.png` ficam no artefato de validação de cada execução; Chromium mobile 390×844 e desktop 1440×900 também foram verificados localmente.

A rota `/testes/recuperacao` e seu formulário existem somente em `tests/fixtures/shell/`. O build público devolve 404 nessa rota. Esse ensaio não é uma tela de aposta publicada, sessão simulada no SPA, API de prévia nem prova de billing. #11 conecta identidade real, #13 páginas de erro e #17/#18 consumidoras de filtros/apostas. Os gates permanentes de CI e identidade real da #49 permanecem obrigatórios no SHA final.
