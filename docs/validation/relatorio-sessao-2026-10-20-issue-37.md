# Relatório da sessão de desempenho e acessibilidade da issue 37

Registro de 20/10/2026, com consulta de estado às 20h56 no fuso America/Sao_Paulo. Repositório: `pradyumna-001/bancaemdia-frontend`.

O trabalho concentrou-se em corrigir e validar a issue #37. Houve melhorias de carregamento, fontes, seletores, testes e medições autenticadas. **A PR #105 permanece aberta em rascunho e não está pronta para entrega**: o CI do último commit publicado tem falhas reais de acessibilidade/interação no Chromium e de desempenho no perfil desktop. Uma otimização adicional de Apostas está salva localmente, com seus 20 testes aprovados, mas ainda sem validação completa, commit ou push.

Este relatório foi solicitado durante a correção. A implementação foi interrompida para preservar o estado e permitir uma retomada precisa. O relatório não encerra a issue nem certifica a PR.

## Objetivo e decisões do usuário

- Concluir a #37 sem entregar PR em rascunho, com falhas ou checks pendentes. A entrega anterior foi prematura; a correção continua pendente.
- Manter a PR contra `main`, sem PRs empilhadas. Dependências devem estar declaradas; revisão e merge continuam com o administrador.
- Preservar os limites obrigatórios de desempenho, a cobertura, as jornadas reais e o isolamento de demonstrações. Nenhum gate deve ser relaxado para obter aprovação.
- O usuário confirmou que textos e controles continuaram legíveis no ensaio solicitado de zoom em 200% e 400% no Chrome. Trata-se de relato manual da demonstração, separado das provas automatizadas do aplicativo público autenticado.
- O usuário dispensou o ensaio manual do Narrador: “nao me importo com o narrador, so considera que está certo”. O registro correto é **ensaio manual dispensado pelo titular**, sem alegar que o Narrador foi executado ou aprovado.
- Não há nova resposta do usuário pendente para continuar a correção técnica.

## Versão e estado de publicação

| Item                             | Estado registrado                                                     |
| -------------------------------- | --------------------------------------------------------------------- |
| Issue                            | [#37](https://github.com/pradyumna-001/bancaemdia-frontend/issues/37) |
| PR                               | [#105](https://github.com/pradyumna-001/bancaemdia-frontend/pull/105) |
| Branch                           | `feat/37-performance-acessibilidade`                                  |
| Base da PR                       | `main`                                                                |
| Estado remoto                    | `OPEN`, `isDraft: true`, revisão `CHANGES_REQUESTED`                  |
| HEAD publicado                   | `ee55dbf7e250832362513c77f3993a927d25677a`                            |
| Árvore desse commit              | `9ba5cfba3b6d89b8fc3c6d9107b0f6a4a14a827e`                            |
| Mensagem do commit               | `perf: reduzir consultas iniciais e estabilizar seletores (#37)`      |
| Alteração commitada nessa rodada | 35 arquivos, 355 inserções e 32 remoções                              |
| Estado local ao salvar           | Dois arquivos de implementação modificados, além deste novo relatório |

O commit anterior usado em comparações era `8b7127c868d6caadff1a6e62d98223cd42d44afc`. Seus resultados não aprovam o HEAD atual. O trabalho local posterior ao HEAD também precisa de validação própria.

Não houve merge, deploy, publicação externa, alteração do backend ou promoção do contrato sandbox para produção.

## Alterações concluídas e publicadas nesta rodada

### Carregamento dos filtros

Os catálogos de opções ainda não selecionadas passaram a carregar ao abrir o seletor, reduzindo consultas na entrada da página. Dimensões ativas e identidades selecionadas continuam sendo consultadas para representar corretamente os filtros existentes na URL.

Foram conectados os consumidores de filtros gerais, casa em Nova aposta, filtro e criação de conta em Contas, casa em Troca de conta e dimensões de Análises. Busca, paginação, IDs exatos e tratamento compartilhado de Retry-After foram preservados. Reabrir o seletor não repete automaticamente uma consulta que falhou.

O catálogo aceita uma ação opcional de abertura, e o seletor comunica a abertura ao consumidor. Os testes passaram a abrir o controle antes de esperar os dados carregados sob demanda.

### Foco dos seletores e datas

`EscolhaFiltro` e `DataFiltro` passaram a focar o acionador antes de abrir o diálogo, cobrindo o comportamento de ponteiro do WebKit. No fechamento, a restauração de foco respeita um gesto posterior: só ocorre se o foco ainda estiver no corpo da página ou no diálogo que está sendo encerrado.

### Fontes e custo inicial

Os subconjuntos de Source Sans 3 foram reduzidos ao repertório necessário da interface em português, incluindo pontuação, moeda e símbolos utilizados. O conjunto passou de 106.712 para **67.252 bytes**, redução aproximada de 37% nessa comparação.

A família interna permanece `Bancaemdia Interface`, conforme a licença OFL e os nomes reservados. Os três arquivos originais completos foram mantidos como fallback. A geração verifica hashes de origem, contornos, avanços e recursos numéricos e de espaçamento. Manifesto, script e intervalos Unicode do CSS foram mantidos coerentes.

### Renderização e densidade

Em Análises, `content-visibility: auto` ficou restrito a `.analises-banca`, com dimensão intrínseca apenas no eixo de bloco. Tabelas e períodos continuam no DOM e na árvore de acessibilidade.

As linhas de Apostas mantêm altura natural. Experimentos com `content-visibility` nas linhas causaram problemas de densidade, overflow e estabilidade e foram removidos antes do commit publicado. Permaneceram ajustes de coluna com `minmax(0, 1fr)` e largura mínima dos elementos para evitar expansão horizontal indevida.

### Preparação da sessão nas medições reais

Foram adicionados `scripts/prepare-measurement-session.mjs` e `tests/identity/measurement_session.py`. O preparo usa a sessão real e uma renovação explícita antes de cada navegação privada medida, com CSRF atual e Web Lock. Também prepara a sessão depois do seed demorado.

O documento de preparação é o `/config.json` público na origem correta, sem carregar antecipadamente JavaScript ou fontes da SPA. O cache é limpo depois dessa preparação para manter fria a navegação efetivamente medida. A página de seed é fechada antes de passar a sessão ao navegador de medição, evitando rotação concorrente de cookies.

O JWT interno da fixture continuou com validade de 30 segundos. Não houve aumento de TTL, limites de rate limit, relógios ou tolerâncias para aprovar o ensaio. Cookies transitam somente em memória ou stdin; falhas são projetadas em códigos seguros, sem imprimir payloads privados.

### Testes e documentação

- A espera de interação no ensaio de acessibilidade utiliza o prazo já existente de cinco segundos para observar o estado selecionado real, em vez de concluir após apenas um frame.
- Falhas de asserção e do Playwright são convertidas em códigos controlados, evitando DOM e dados privados nos resultados publicados.
- A prova de logout em Hipotética espera a situação real das consultas pendentes antes do gesto de saída.
- A fixture de Shell responde aos endpoints de Apostas e resumo utilizados pelo cenário, evitando que erros artificiais tardios interfiram na prova do atalho de conteúdo.
- Foram acrescentados sete casos de preparo de sessão, dois casos de regressão de foco e um caso de adiamento das consultas de catálogo.
- ADRs 006 e 008, contrato e validação de desempenho/acessibilidade, proveniência das fontes e o corpo canônico da issue foram atualizados. O corpo remoto da issue foi sincronizado na rodada publicada.

## Escopo anterior da #37 preservado

O trabalho manteve as melhorias já existentes na branch: carregamento lazy de 23 páginas fora da área de conta; orçamento considerando preloads de 25 rotas; bootstrap público antecipado de configuração com CSP por hash exato; caches limitados de configurações de formatação; reserva de espaço durante carregamentos; isolamento da demonstração; servidor estático com compressão e CSP correspondentes ao build; e relatórios autenticados com campos permitidos.

O catálogo obrigatório tem 32 rotas e exige três navegações frias por rota em cada um dos dois perfis, totalizando 192 amostras. Não é permitido selecionar apenas a melhor amostra, aceitar uma página anônima em lugar de uma rota privada ou substituir dados ausentes por uma medição aparentemente válida.

Esses itens representam a composição mantida da #37, não uma afirmação de que todos foram escritos novamente nesta rodada ou de que o conjunto já passou no CI final.

## Verificações locais concluídas

| Verificação                                                        | Resultado e alcance                                                                                                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make lint typecheck test`                                         | Aprovado: 107 arquivos de testes, 1.640 testes, nenhuma falha e nenhum skip, antes da otimização local ainda não commitada                                                       |
| Lint e typecheck finais da rodada publicada                        | Aprovados, incluindo hooks normais de commit                                                                                                                                     |
| Ruff                                                               | Aprovado para 43 arquivos                                                                                                                                                        |
| Build e orçamento JavaScript                                       | Aprovados: pior entrada 150.166 bytes gzip, base 117.010 bytes, limite 200.000; 25 orçamentos de rota e 23 páginas lazy                                                          |
| Seletores, Troca e isolamento público                              | 28 casos aprovados em Chromium/WebKit, nos perfis mobile e desktop                                                                                                               |
| Densidade, modos de leitura, teclado, contraste e reflow em 320 px | 12 casos finais aprovados em Chromium/WebKit, mobile e desktop, com altura natural das linhas e sem retry                                                                        |
| Lighthouse público de diagnóstico                                  | Nove amostras aprovadas: Tutorial, Extensão e Entrar, três por rota; performance 98–99, acessibilidade 100, boas práticas 100, LCP entre 2.008,562 e 2.271,454 ms e CLS 0,028436 |
| Testes de Apostas após a otimização local parcial                  | 20 aprovados, zero falhas e zero pendentes; ainda sem a validação completa da alteração                                                                                          |

O Lighthouse público acima é um diagnóstico local de uma árvore anterior à conclusão da rodada. **Não substitui as 192 medições autenticadas do SHA final.** O Firefox local não pôde iniciar (`spawn UNKNOWN`); não foi declarado aprovado localmente. As provas Firefox continuam exigidas no CI.

Houve execuções intermediárias com falhas durante os experimentos de renderização. O resultado final dirigido à densidade foi 12/12; não existe alegação de uma execução final limpa de 68/68 para aqueles experimentos. A suíte completa de interface do CI ainda precisa ser concluída e conferida no SHA de entrega.

## Evidências do CI já verificadas no HEAD publicado

### Artefato público

O artefato público `12307087545`, do workflow de qualidade da PR `39514310599`, foi baixado e verificado contra `ee55dbf7e250832362513c77f3993a927d25677a`.

Foi confirmada a presença exclusiva do build público e sua configuração de segurança, sem fixture de demonstração; CSP e codificação correspondentes; fontes esperadas; imports lazy e preloads; e orçamento de 150.166 bytes gzip. SHA-256 do ZIP: `71ec2eed60c69bb51b62f8f10f6bfcbf9a42a2a6b61209fc4fcc71e937b8fbfb`.

### Produto conjunto

Os artefatos Firefox `12307816963` e WebKit `12307977624`, do workflow `39514305941`, foram verificados: 22 jornadas reais por navegador, com versão, pin, inventário, ausência de skips e regras de privacidade dos traces. Isso não equivale à conclusão dos três navegadores; o artefato Chromium ainda precisava de conferência.

### Acessibilidade real no WebKit

O artefato `12307728738`, do workflow `39514306022`, passou na verificação dos relatórios mobile e desktop. Cada perfil registra 64 verificações de rota/tema e 176 alternativas de gráficos. Foram registrados quatro cliques confiáveis, nove entradas de Event Timing e máximo de 16 ms; esse perfil não recebeu a redução de CPU aplicada ao Chromium.

O artefato de acessibilidade Firefox `12309120022` apareceu, mas ainda não tinha sido baixado e validado ao interromper a implementação.

Os relatórios autenticados completos de desempenho e o artefato final de qualidade, incluindo toda a suíte de interface e cobertura por arquivo, ainda não tinham sido conferidos. Resultados individuais não aprovam o conjunto.

## Falhas e estado do CI no momento do relatório

Na consulta às 20h56, havia **63 checks** no HEAD publicado:

- 41 concluídos com sucesso;
- 2 concluídos com falha;
- 15 em execução;
- 5 na fila.

Os estados são um retrato temporal e podem mudar depois deste registro. As duas falhas conhecidas eram:

| Check                                                                                                                               | Estado conhecido                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Acessibilidade real Chromium push](https://github.com/pradyumna-001/bancaemdia-frontend/actions/runs/39514306022/job/118942663149) | Falhou com `INTERACTION_LATENCY_EXCEEDED` nos perfis mobile e desktop                           |
| [Performance real desktop push](https://github.com/pradyumna-001/bancaemdia-frontend/actions/runs/39514306022/job/118942662951)     | Falhou; a causa detalhada ainda não tinha sido diagnosticada com projeção segura dos relatórios |

A falha de interação ocorre na alternância entre Cartões e Lista compacta com 100 apostas, acima do limite de 200 ms no ensaio Chromium com CPU reduzida em quatro vezes e rede de 150 ms/200.000 bytes por segundo. O diagnóstico apontou reconstrução do conteúdo de todas as linhas durante a troca de modo.

A revisão administrativa permanece `CHANGES_REQUESTED`. O comentário existente se referia a um commit anterior e continha observações sobre catálogo de rotas, orçamento, baseline e ferramentas. Foram registrados no texto da PR os mecanismos efetivamente existentes, incluindo catálogo de 32 rotas, auditorias oficiais e uso de axe. Não houve dispensa da revisão, autoaprovação ou enfraquecimento de requisitos. A decisão do administrador continua pendente.

## Correção local preservada e ainda não publicada

Dois arquivos estão modificados depois do HEAD:

1. `src/features/apostas/ApostasPage.tsx`: separação do conteúdo estável das linhas de seus controles dependentes do modo de exibição. O conteúdo principal usa `memo`; a projeção da aposta usa `useMemo`; um contexto booleano comunica o modo compacto somente aos poucos elementos que precisam mudar. O link de detalhe consome a localização separadamente e preserva os parâmetros da URL. A intenção é evitar reconstruir os detalhes de todas as apostas ao trocar o modo.
2. `tests/identity/test_performance_accessibility_contract.py`: o código seguro da falha de latência inclui o máximo numérico observado para facilitar o diagnóstico, mantendo o limite de 200 ms.

As projeções continuam na memória dos componentes montados, sem cache global de apostas ou persistência privada. Não foram adicionadas virtualização, ocultação de valores, alteração financeira ou exceções de segurança. O agrupamento de páginas foi inspecionado e preserva as referências dos itens, condição necessária à memoização.

O teste dirigido de Apostas terminou com **20/20 aprovados**. Isso verifica regressões funcionais cobertas pela suíte, mas **não prova redução da latência no ensaio real**, nem substitui lint, typecheck, suíte completa, build e CI após um novo commit.

Ao salvar, o diff desses dois arquivos tinha 170 inserções e 116 remoções. Uma cópia do patch foi preservada junto às evidências da sessão. A otimização não foi commitada nem enviada ao GitHub.

## Contrato da API e dependências

| Referência                                       | Versão registrada                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `main` frontend, na última conferência da rodada | `b5fb27d197b4129c98c896232517e841bf8abca9`                         |
| PR #104 herdada e declarada                      | `7bc8b7a7ce6274c3dec282164c4d2c3f29ce12b9`                         |
| `main` backend, na última conferência da rodada  | `b916f54331f14cf47a3800324bd61d8638043c06`                         |
| Sandbox único da API                             | `136f36094119edb09bea1343743c1c50ef460d93`                         |
| Operações do contrato                            | 129                                                                |
| SHA-256 OpenAPI                                  | `04f091f45b327f4fe87d629afa0a2df4fca84674686fd4e145be35bb0b0460dd` |
| Disponibilidade                                  | `sandbox_reconciliation`                                           |

A verificação da API após o push confirmou o hash, as 129 operações, preservação das 128 operações anteriores e verificações dos workflows. Não foi feita união manual de schemas.

O bloqueio de produção continua: a composição sandbox exige integração administrativa e revalidação do pin e das jornadas. A conclusão da #37 não substituirá os aceites próprios de publicação e distribuição das #38/#39. Dependências anteriores continuam declaradas na PR.

## Arquivos e evidências para retomada

Diretório local principal: `C:/Users/User/.codex/attachments/performance-37/`.

| Arquivo ou conjunto                                                                      | Utilidade                                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `current.json`                                                                           | Checkpoints detalhados anteriores; os últimos registros antecedem a nova falha Chromium e a otimização parcial, portanto devem ser lidos junto deste relatório |
| `pr-body.md`                                                                             | Corpo preparado da PR, com escopo, dependências e validações da rodada publicada                                                                               |
| `runs-ee55dbf.json`                                                                      | IDs dos workflows push e PR do HEAD publicado                                                                                                                  |
| `quality-catalog-consumers-final.log` e `unit-catalog-consumers-final.json`              | Aprovação local de lint, tipos e 1.640 testes                                                                                                                  |
| `lint-types-density-final.log`                                                           | Verificação local posterior de lint e tipos                                                                                                                    |
| `build-natural-rows-final.log`                                                           | Build e orçamento com altura natural nas linhas                                                                                                                |
| `focus-browser-configured.log` e relatórios correspondentes                              | 28 casos dirigidos de seletores, Troca e isolamento                                                                                                            |
| `natural-final-browser.log`, `catalogs-natural-final-browser.json` e pasta de resultados | 12 casos finais de densidade e acessibilidade visual                                                                                                           |
| `public-latin-configured.log` e `public-diagnostic.json`                                 | Lighthouse público local de diagnóstico                                                                                                                        |
| `public-artifact.json`, `public-artifact.zip` e `public-proof.json`                      | Proveniência e verificação do build público do CI                                                                                                              |
| Conjuntos `product-artifact-firefox` e `product-artifact-webkit`                         | Jornadas reais de produto já conferidas                                                                                                                        |
| `accessibility-ee55-webkit/` e relatórios `accessibility-webkit-*.json`                  | Acessibilidade autenticada WebKit conferida                                                                                                                    |
| `a11y-chromium-ee55-push.log`                                                            | Log local da falha Chromium; pode conter dados privados e não deve ser publicado ou despejado no chat                                                          |
| `memo-row-tests.log` e `memo-row-tests.json`                                             | Resultado 20/20 da otimização local parcial                                                                                                                    |
| `uncommitted-session-2026-10-20.patch`                                                   | Cópia dos dois arquivos de código modificados e ainda não commitados                                                                                           |
| `relatorio-sessao-2026-10-20-issue-37.md`                                                | Cópia deste relatório junto às evidências                                                                                                                      |

Os logs brutos não integram este relatório. Cookies, tokens, DOM autenticado, cabeçalhos e URLs privadas devem permanecer fora de artefatos publicáveis. Os verificadores e projetores seguros existentes devem ser utilizados ao investigar falhas.

Documentação principal no repositório: `docs/contracts/performance-acessibilidade.md`, documentação de validação de desempenho/acessibilidade e ADRs 006/008. O caminho da API sandbox local é `C:/Users/User/.codex/worktrees/produto-sandbox-20261018/bancaemdia-api` e foi usado para leitura e conferência, sem alteração.

## Retomada necessária para concluir a issue

1. Conferir a otimização local de Apostas, executar as verificações necessárias e medir a troca de modo com 100 apostas sob as condições reais do ensaio. Só declarar corrigida quando a latência cumprir o limite.
2. Diagnosticar a falha de desempenho desktop a partir dos relatórios sanitizados. Corrigir a causa sem reduzir os limites, descartar amostras ou aceitar páginas incompletas.
3. Concluir lint, typecheck, testes, build e verificações de segurança no código final. Preservar os gates anteriores, a cobertura mínima de 80% por arquivo nas quatro métricas e o orçamento JavaScript.
4. Fazer commit e push com os hooks normais, atualizar a descrição da PR e aguardar os checks do novo SHA. Sucesso no commit anterior não aprova a nova versão.
5. Conferir o inventário completo: 192 medições frias autenticadas, critérios por amostra, provas de acessibilidade nos três navegadores e dois viewports, suíte de interface, jornadas reais, artefato público e privacidade dos relatórios e traces.
6. Confirmar o estado final da revisão administrativa e a base/dependências. Converter a PR para pronta somente após todos os checks exigidos estarem verdes no SHA final e nenhuma correção necessária permanecer pendente.
7. Entregar o estado real ao usuário, mantendo o merge com o administrador e o bloqueio de publicação até os aceites próprios.

A demonstração usada na sessão ficou no endereço `http://127.0.0.1:4230/`. Sua disponibilidade depende do processo local; este relatório não certifica que o servidor continuará ativo após reinício do computador.

## Estado de encerramento deste registro

O código publicado está preservado no Git; a correção adicional está preservada no workspace e em patch local. O relatório registra os resultados aprovados, as duas falhas conhecidas e as verificações ainda necessárias. **A #37 permanece em andamento e a PR #105 permanece sem aprovação para entrega ou produção.**

## Continuação de 21/10/2026

A PR #105 **continua em rascunho e não está pronta**. Esta seção registra a
continuação e substitui o estado de encerramento acima.

### Commits publicados nesta continuação

| SHA       | Conteúdo                                                                                                                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e9a702c` | Linhas de Apostas memoizadas e `content-visibility`; calha de rolagem no desktop; blocos finais de Telegram/Assinatura após a primeira consulta; fontes com sub-rotinas CFF expandidas (60.872 bytes, contornos/hints/avanços idênticos) |
| `004b5bb` | Agrupamento de chunks de rota (`scripts/route-chunks.ts`); link de detalhe com âncora e handler único; cartão de fuso em Metas após a lista; diagnóstico de LCP seguro no relatório (tag/classe e números)                               |
| `9c4ad9c` | Calha simétrica (`both-edges`) para painéis centrados                                                                                                                                                                                    |
| `823afc5` | CSS em arquivo único; módulos pequenos sem dependências externas na entrada; RegExp do contrato compilado uma vez; `content-visibility` a partir da 4ª linha                                                                             |
| `fecdfab` | Evoluções por banca (Painel) e de caixa (Análises) com valor adiado e `content-visibility`                                                                                                                                               |
| `e736cb2` | Modo compacto aplicado pela lista; linhas não re-renderizam na troca (estilos computados idênticos em 320/390/1440 px)                                                                                                                   |

Em cada commit: lint, typecheck, 1.645 testes unitários (108 arquivos), build,
orçamento JS (pior rota 157.707 bytes gzip) e e2e dirigidos em Chromium/WebKit
mobile/desktop. A suíte e2e completa local (Chromium/WebKit) teve 652 aprovados;
as 8 falhas restantes são do WebKit para Windows (Tab não foca links) e ocorrem
igualmente no commit de base `ee55dbf`. Firefox local não inicia; o CI cobre.

### Resultado no CI (medições sanitizadas)

- **Desktop:** aprovado em push e PR no `e736cb2` (era: Assinatura 0,282,
  E se 0,894 e Metas 0,175 de CLS).
- **Checks do `e736cb2`:** 60 de 63 aprovados após reexecutar dois jobs que
  falharam por infraestrutura (API não iniciou; erro interno do WebKit).
- **Acessibilidade real:** Firefox e WebKit aprovados. Chromium oscila no limite
  de 200 ms: `823afc5` aprovado (push e PR), `fecdfab` 208 ms (push),
  `e736cb2` aprovado no push e 272 ms no PR. Custo local da troca caiu cerca de
  60% em relação ao `ee55dbf`.
- **Mobile:** ainda reprovado. Rotas leves e públicas 2,0–2,45 s. Rotas pesadas
  oscilam entre 2,32 e 2,59 s conforme a execução (degraus de uma ida e volta).
  Painel tem LCP próximo de 2,5 s e TBT 150–360 ms (score 88–95). Resultados
  2,77–3,03 s e Análises 2,91–3,57 s.

### Impedimentos e decisões pendentes

1. **Análises e Resultados têm LCP dependente de dados.** O maior elemento é texto
   das seções de dados. A regra 55 exige uma única resposta ao vivo para Análises
   (cerca de 140 KB de JSON sem compressão na API e no ensaio); Resultados recebe
   a fila com `page_size` padrão 50 (cerca de 55 KB). Antecipar dados privados
   antes da conferência da sessão contraria `docs/contracts/sessao.md`. Atingir
   2,5 s exige mudança fora do frontend (compressão no proxy da API em produção e
   no ensaio, ou contrato com resposta menor) ou decisão de produto (página menor
   na fila de Resultados).
2. **Hinting das fontes.** Remover hints CFF reduziria mais 10 KB, mas altera a
   renderização no Windows (seminegrito mais pesado). Não aplicado sem decisão.
3. **Margem estatística.** Rotas pesadas e a latência no Chromium ficam no limite;
   a variação do runner troca aprovação por reprovação entre execuções.

### Revisão administrativa (`CHANGES_REQUESTED`)

- Catálogo de rotas: `tests/unit/performance-policy.test.mjs` compara o catálogo
  com `ROTAS_PROTEGIDAS/PUBLICAS/AUTH`; rota nova sem medição reprova.
- Baseline/LHCI: o ensaio usa Lighthouse programático com três navegações frias
  por rota/perfil, não `lhci`; não há baseline a estabelecer.
- Budgets mais flexíveis por rota: não aplicados. A regra 60 e a instrução do
  titular mantêm os limites uniformes.
- axe-core: já usado nos e2e (`@axe-core/playwright`) e no ensaio real.
- Middleware ASGI: sem alteração de backend nesta PR.

Narrador: ensaio manual **dispensado pelo titular**; não foi executado nem aprovado.
Zoom 200%/400%: confirmação manual do titular.

Não houve merge, deploy, alteração de backend ou promoção do contrato sandbox.

## Continuação 2 de 21/10/2026

A API pinada passou a `37b1302` (#106/#209, leituras JSON comprimidas pela API).
No `5778ec2`, desktop e acessibilidade Firefox/WebKit passaram; Chromium reprovou
no push com `INTERACTION_LATENCY_EXCEEDED:232` e aprovou no PR; mobile reprovou
em 15 rotas. Rotas leves ficaram em 2,42 s e as que carregam `rotas-comum` no
degrau seguinte (cerca de 2,575 s); Painel com TBT 199–374 ms.

### Diagnóstico (laboratório local, dados sintéticos, Lighthouse 13.5 simulate)

- O LCP simulado é limitado pela banda: tudo que termina antes do LCP observado
  divide a mesma conexão simulada, e os resultados saltam em degraus de uma ida
  e volta (150 ms). As três fontes pré-carregadas somavam 61 KB do caminho.
- Latência da troca Cartões/Lista: o clique não alterava nada visível; a
  navegação renderiza como transição e a primeira pintura só vinha depois do
  render, commit e layout das 100 linhas (até 336 ms com CPU 4×).
- Painel: `moeda()` via `formatToParts` era o maior custo de CPU (93 ms com CPU
  4×), e o gráfico de evolução recalculava rótulos em laço O(n²); cada consulta
  concluída re-renderizava os 40 gráficos e as comparações.

### Mudanças

- Fontes: cada peso dividido por `unicode-range` em parte principal pré-carregada
  (49.296 bytes nos três pesos, antes 60.872) e complementar sob demanda; mesma
  faixa total, contornos, hints e avanços idênticos aos originais.
- `moedaMenor`: molde por formato derivado do `formatToParts` de amostras e
  conferido na criação (sem valores guardados); teste de equivalência exata com o
  caminho anterior. `dataHora` guarda o fuso resolvido junto do formatador.
- `LinhaEvolucao` calcula posição e rótulo de cada ponto uma vez por render;
  evolução, comparações e grupos do Painel memoizados.
- Botão de visualização e classe da lista em Apostas mudam no quadro seguinte ao
  gesto; a URL continua a fonte do modo e voltar/avançar descarta a escolha
  pendente. Resumo das linhas sem dependência do modo (a classe da lista decide
  texto ou ícone).

Laboratório com CPU 4×: troca 344–888 ms antes, 104–232 ms depois (sem traço; o runner do CI mede abaixo do laboratório). LCP mobile de
Enviar, Metas, Revisão e Troca passou de 2,54–2,61 s para 2,36–2,44 s.

### Alternativas medidas e descartadas

- Entrada pequena com sessão antecipada e React em paralelo: 2,52–2,63 s (fila
  de conexões); revertido.
- CSS por rota (menos bytes, mais requisições): pior. CSS embutida no HTML: o
  documento passa da primeira janela TCP e ganha uma ida e volta.
- `react-router` de produção por alias: duplicou o pacote.
- Fonte variável oficial (24,8 KB para os três pesos): sem hints nos glifos e
  contornos diferentes das estáticas; mesma classe de troca que o titular recusou
  para os hints, não aplicada.
- Pré-carregar só o peso regular: troca visível de fonte nos títulos (CLS).
- Remoção de hints CFF: não aplicada, por decisão do titular.

### Continuação 3 (21–24/10/2026)

- Painel: grupos compartilhados contidos num grupo maior se unem a ele, e
  módulos usados só por páginas pesadas entram em `rotas-comum`. O Painel passou
  de três chunks extras para um; desde então passa (2,44–2,45 s no CI).
- Páginas protegidas: o carregador inicia a importação junto com a consulta de
  sessão, e a página renderiza sem nova suspensão quando o módulo já chegou.
  Catálogos desligados não criam observadores de consulta.
- Resultados: a fila começa assim que o guard confirma a sessão, sem esperar o
  render da página; validação sem repetir o esquema por item; lista "A seguir"
  depois da aposta atual. A causa restante era o tamanho da primeira página (50
  apostas, ~6 KB): acima de ~4,3 KB a resposta pedia uma ida e volta a mais no
  perfil móvel. **Decisão do titular em 24/10/2026: páginas de 25.** Contrato da
  #27 e jornada real (53 itens em três páginas) atualizados.
- CLS: a margem das telas iniciais atravessava `#root`/`body`, e o corpo subia
  24 px em toda primeira carga (~0,028). Com `#root` em `flow-root`, a maioria das
  rotas caiu para 0,004 no CI.
- Diagnósticos seguros adicionados ao relatório: requisições de API e CPU antes
  do LCP, e os três maiores deslocamentos (tag/classe e pontuação).
- Latência de interação no CI: 104 ms (desktop) e 64 ms (mobile).
- Calendário dos filtros de data, conteúdo dos seletores de opções e menu "Mais
  opções" do shell montados só com o diálogo aberto (menos trabalho no render que
  antecede a primeira pintura).
- O job "E2E central real" (Chromium) levava 27–29 min com limite de 30 e foi
  cancelado por tempo; o limite passou a 45 min, sem alterar testes ou critérios.
- Regressão intermitente na jornada real de Metas (Chromium, push de a15cbd0;
  passou em a85156e): o seletor reaberto ficou vazio e sem nome porque o `close`
  atrasado da escolha anterior chegou depois da reabertura. Seletores de opções,
  de data e o menu do shell só desmontam o conteúdo quando o diálogo está de fato
  fechado; teste unitário e passo de reabertura na jornada de fixture cobrem o
  caso.

### Continuação 4 (24–25/10/2026)

- `d1ce9d3`: 60 de 63 checks verdes. Falhas: WebKit com erro interno do navegador
  em `page.goto` (Testes), logout sem resposta em 30 s no Firefox (E2E produto,
  mesmo ponto já visto em 21/10 no `da0329c`; o PR do mesmo SHA passou) e uma
  amostra mobile de Resultados com LCP 2.516 ms (as outras duas: 2.426 e 2.432).
  Várias rotas estavam entre 2,44 e 2,46 s; não basta repetir o job.
- Laboratório (Lantern, dados sintéticos): o LCP segue o total de bytes antes da
  primeira leitura de API. Duas mudanças reais de bytes:
  - Fontes: a parte pré-carregada deixa de levar todo o Latin-1 e fica com as
    letras e sinais do português (nas duas caixas), `·`, `×`, `ª`, `º` e `°`; as
    demais letras vão para a parte complementar sob demanda. 38.592 bytes nos três
    pesos (antes 49.296); contornos, hints, avanços e faixa total iguais.
  - Compressão: o build grava `.gz` com Zopfli (gzip padrão) e o nginx os entrega
    com `gzip_static`; caminho crítico de Resultados 164.007 → 158.149 bytes. O
    servidor do ensaio entrega os mesmos arquivos; o container confere bytes. O
    budget JS continua medido em gzip nível 9. Nova dependência de build
    `@gfx/zopfli` 1.0.15 (Apache-2.0), fixada; o lockfile não muda outras versões.
- Laboratório, seis amostras por build em Resultados: 2.404–2.487 ms antes,
  2.157–2.288 depois; Apostas e Painel também caíram um degrau (≈150–230 ms).
