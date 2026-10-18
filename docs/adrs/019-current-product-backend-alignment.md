# ADR 019: Produto vigente, contratos e ordem de implementação

## Status

Accepted — direção autorizada pelo titular em 29/09/2026; implementação/revisão no PR da #48. Aceitação da direção não declara futuras capacidades entregues ou API em produção.

## Context

A auditoria comparou main, cadeias abertas do backend e as 39 issues frontend. O ADR013 anterior usava o inventário do monólito como limite do produto. A pesquisa visual corrigiu apresentação, mas não incluiu a expansão de produto. [Auditoria](../audits/backend-2026-09-29.md), [contratos](../API-CONTRACTS.md).

## Decision

1. Escopo é a matriz de tarefas do produto atual: identidade, acesso/assinatura, titulares/contas temporais, apostas, caixa, revisão por motivo, canais de entrada, coleta por instalação, painel/análises/metas, quatro calculadoras e privacidade. O monólito é referência de regressão nas tarefas preservadas, nunca inventário exclusivo ou gabarito visual.
2. Cada capacidade informa estado: integrada em commit, em PR, planejada ou bloqueada por contrato. Main backend auditada: `bd055417459f796fed960b5b37efb33a9744419f`. O gerador de tipos já usa essa mesma referência e permanece nela até integração/versionamento aprovado; não gerar contrato fictício unindo branches.
3. Os textos canônicos das issues futuras vivem em `docs/backlog/NNN.md`, com manifesto número/título/dependência. ADR014–018 indexam esses textos; não manter cópias divergentes de aceites. Issues GitHub são verificadas contra os arquivos após publicação.
4. Reaproveitar #1–7. Corrigir #3/#6 com rotas protegidas e destinos secundários para Contas e titulares, Calculadoras, Assinatura e Configurações a partir de ABAS. Análises/Metas e Conexões/Privacidade são rotas filhas; detalhes mantêm indicação da área. Rotas placeholder não são implementação de domínio.
5. Apostas/Painel/Enviar permanecem acessos móveis diretos, Revisão condicional e Mais para os demais. Desktop não recebe todas as novas funções na barra principal; menu Opções contém destinos secundários. ABAS identifica elegibilidade desktop/mobile, não permissão de negócio.
6. Sessão e acesso comercial são separados. 401 é autenticação; 402 é bloqueio de escrita. Leituras/exportação permanecem disponíveis conforme matriz da API. Não inferir permissão apenas por GET/POST. Ainda não antecipar implementação de billing em placeholders.
7. Titular, casa, conta e banca são entidades distintas. Uso temporal decide atribuição no servidor. Uma conta em uso por casa por instante na versão atual; nunca primeira conta arbitrária ou exclusão silenciosa de não atribuídas.
8. Lucro, ROI, saldo, progresso de meta e resultados de calculadoras vêm da API. Formatar e desenhar não autoriza somar dinheiro. Filtros/resumos/exports devem compartilhar população ou explicitar diferença. Refetch não força refresh de MV.
9. Stripe Checkout/Billing, cartão obrigatório, teste único de 168 horas após confirmação do cartão pelo servidor; sem tiers/preços inventados. Quatro calculadoras aprovadas; pesquisa de linhas No-Go. Decisões recentes registradas substituem ADRs históricos conflitantes do backend, mas dependência continua bloqueada enquanto o código/contrato não acompanhar.
10. Upload de prints, prévia XLSX, mídia de aposta, catálogos, preferências e hipotética têm lacunas explícitas em #50/consumidoras. Mock não satisfaz integração. **Correção do titular em 06/10/2026:** o usuário envia o export e acompanha o resultado, sem estimativa/aviso de custo de processamento nem etapa Autorizar/Agora não. Limites máximos de gasto por usuário são controlados exclusivamente pelo backend. Aprovação de gasto não é requisito, lacuna de contrato ou bloqueio de #15/#24/#25. Prévia/confirmação de dados da planilha e confirmação de apostas são jornadas distintas e mantêm seus requisitos próprios.
11. Após revisão dos gráficos iniciais, o titular tornou obrigatórios: lucro por grupo com tipsters dentro do grupo (#20/#50), lucro por esporte (#56) e lucro por dia com data/valor de cada dia legíveis sem hover (#20/#50). Os componentes da #7 não limitam o catálogo visual. Ausência de contrato da hierarquia exige ampliar a API, não retirar a jornada; agregados continuam exclusivos do servidor. Diário não é linha acumulada nem mapa por dia da semana. Propostas visuais serão validadas nos dois viewports antes de implementar essas jornadas.

## Ordem por dependências

- #48 corrige planejamento e fundação; #8 pode concluir infraestrutura sem esperar telas.
- #49 identidade e #50 contratos são prioridades de integração. Dentro de #50, entregar contratos por capacidade; uma lacuna de Hipotética não bloqueia cliente de Apostas já suportado.
- #9/#10/#11/#12 e #52 estabelecem transporte, sessão, erros e acesso; #51 assinatura e #32 contas viabilizam primeiro uso (#59).
- #16/#17 e #32 precedem telas dependentes de contexto financeiro; #53 cobre troca temporal.
- #18–20, #27–29 e #31 usam contratos correspondentes. #21 permanece bloqueada até contrato e prioridade registrados; não é pré-requisito universal.
- #15/#24–26, #34/#54 e #35 fecham canais; cada contrato de entrada precisa de seu aceite antes de release desse canal.
- #55–58 cobrem calculadoras, análises, metas/fuso e privacidade. #23/#30/#36 validam o conjunto, #37 mede, #39 audita antes de #38 publicar.

Dependência em #50 significa resolver o contrato específico usado pela issue, não esperar todas as lacunas do produto para qualquer progresso. Números crescentes não determinam a ordem. A antiga divisão em cinco semanas permanece apenas como origem histórica dos números; não é prazo vigente. O índice do backlog registra o encadeamento.

## Consequences

### Entrega de Enviar (#24)

Importação web restaura somente UUID de job pela URL, preservando filtros/fragmento. Arquivo fica em memória; aceitação 202 não é conclusão. POST não ganha replay automático nem idempotência inventada. Sem UUID após uma resposta perdida, consulta de apostas é explicitamente não conclusiva; nova intenção exige nova seleção. Pausa afeta somente observação. A prova completa acrescenta worker/Redis/materialização reais no sandbox de identidade, usando cache de extração sintético e sem inserir resultados finais. Ver [contrato de Enviar](../contracts/enviar.md).

Novas unidades #49–59 completam o planejamento sem duplicar implementação financeira. A fundação visual continua conforme ADR006 e pesquisa aprovada. Toda issue de tela contém objetivo, contrato/versionamento, disponibilidade, dependências, tarefas e aceite desktop/mobile. Release exige API integrada, ambiente real e evidências; ensaio de backend #155 é útil, mas não prova experiência web nem produção.

## Fluxo de correção dos primeiros PRs

O PR de #48 é incremental sobre `feat/7-graficos-svg`; não reescreve commits anteriores nem faz merge administrativo. As #1–7 recebem nota de auditoria do que foi preservado/corrigido. Tipos, tokens, fontes, marca e gráficos da fundação não são descartados para reproduzir outra vez o monólito. Gates existentes permanecem obrigatórios no SHA final.

## Revalidação de acesso — 08/10/2026 (#52)

A main backend b916f54 integra billing/acesso e é a única fonte pinada desta PR. #52 precede #18/#32 na ordem de dependências. O aviso é contextual, mantém leitura/exportação e encaminha a Assinatura; não implementa checkout (#51). Status desconhecido fecha escrita, e recuperação exige uma nova intenção explícita. A matriz de operações e prova real estão em [acesso](../contracts/acesso.md). Reconciliar a formatação herdada da #16/PR #69 e os consumidores de escrita das PRs #73/#75 na integração; nenhum PR é empilhado. O candidato de filtros #184 continua exclusivo da entrega autorizada #17 e não é promovido por esta PR.

## Conexão Telegram — #54

O contrato de vínculo está integrado em b916f54. A página em Configurações e o atalho em Enviar usam código transitório, polling finito e revogação confirmada; READ_ONLY preserva as exceções de privacidade publicadas e bloqueia upload. O dono autorizou entregar sem endereço público do bot e pediu link fictício em 08/10/2026: âncora interna identificada, endereço real e percurso externo pendentes de lançamento. Prova obrigatória usa SPA/API/banco reais e transporte privado IncomingCommand local; não certifica Telegram externo. Ver [contrato Telegram](../contracts/telegram.md). Dependências frontend #69/#76/#75 declaradas, PR independente contra main; futuro Configurações #33 preserva Conexões.

Atualização #20 (11/10/2026): proposta aprovada e consumo da candidata backend #189 autorizado pelo titular, com dependências contra main e sem schema composto. Diário/grupos/Excel e seus limites estão em [contrato do Painel](../contracts/painel.md). Prova de sandbox não autoriza deploy; integração/reconciliação continua obrigatória.

## Prints web — 12/10/2026

A PR backend #195 entrega o contrato de prints web da #25: admissão por arquivo, consulta/reconciliação e retry explícito versionado. Frontend trabalha contra main declarando #89 e #195, usando sandbox cf20de6 com fonte real reconciliada e OpenAPI inteiro gerado pelo app. Nenhum merge administrativo ou união manual de schemas. A disponibilidade continua sandbox, com publicação bloqueada e revalidação integrada obrigatória. A jornada não exibe custo ou aprovação de gasto.

### Planilha candidata (#26), 13/10/2026

A PR backend #197 entrega catálogo, fonte estável, prévia síncrona, remapeamento e confirmação atômica. Frontend implementa contra main declarando #90 e #197, preservando provas anteriores no sandbox real único 003d3a0. Gerar somente OpenAPI do aplicativo dessa árvore e reconfirmar versão integrada antes de publicar. Confirmação é dos dados da importação, sem custo ou aprovação de gasto. Detalhes e restrição de legado em [contrato da planilha](../contracts/planilha.md).

## Resultados — 13/10/2026 (#27)

Backend #198/#199 entrega fila keyset e revisão entre escritores, reversão por pré-imagem e recibo recuperável. O consumidor segue o sandbox real único autorizado, acrescentando o código dessa candidata às provas anteriores, gerando o OpenAPI inteiro pelo app e preservando a disponibilidade sandbox_reconciliation. Registrar é um gesto, dinheiro e reversão pertencem à API. PR contra main, dependências declaradas e merge com administrador; integração exige novo pin e revalidação antes de publicar. [Contrato](../contracts/resultados.md).

## Revisão — revalidação de 13/10/2026 (#28)

Matching/consolidação e resolução legada já existem em main; não estão integralmente ausentes. O caminho de escolha de tipster conflitante não é consumível pela leitura/resolução de revisão. Publicar a decisão humana, projeção/ações por família, contexto de atribuição, precondição e política temporal antes de concluir a fila avançada. A serialização de uma escrita não substitui a comparação da evidência apresentada. [Auditoria](../audits/revisao-2026-10-13.md); solicitação emergencial preparada para a API, sem número fictício ou PR frontend declarado pronto. Preservar os consumidores existentes e gerar tipos de uma única árvore real pinada após a entrega. Dependências futuras contra main, merge e publicação com o administrador.

## Caixa — 13/10/2026 (#31)

Contrato integrado permite adiantar Caixa enquanto Revisão #28 aguarda a API. Consumidor preserva pin sandbox único da #27, dependências contra main e merge administrativo. Transferência em um POST, dinheiro recebido, idempotência explícita e vínculo distinto de modo/capital de banca. CRUD/capital/modo permanecem #50. [Contrato](../contracts/caixa.md).

## Revisão #28 — 15/10/2026

Backend #200/PR #201 entrega o protocolo pendente. Sandbox único 547a4d0cfce5308dfe71221a77ad6fd5eb6e47cd incorpora #201 ao b37a3f8 e preserva todas as operações anteriores. OpenAPI de 125 operações, hash 09cf9fbb4b46a8dfc20fc4f4a3c97c3b88000612308cfb4e1e8fd4565901854a; sem união de schemas ou publicação. Seis jornadas reais de Revisão e 56 aceites PostgreSQL são acrescentados às provas anteriores. Job central reserva 25 minutos para o inventário ampliado, sem mudar limites de teste/pedido, cobertura, budget JS ou regra de zero skips. [Contrato](../contracts/revisao.md).

## Privacidade #58 — 15/10/2026

Entrega frontend independente da criação manual #29, por decisão do titular de adiantar trabalho enquanto o backend prepara esse contrato. Exportação e anonimização já integradas em b916f54; consumidor mantém o sandbox único 547a4d0 e declara frontend #94 contra main. A SPA apresenta opções, confirmações, limites e recusas; o backend executa exclusão e regras. READ_ONLY, isolamento, descarte de respostas antigas e limpeza após confirmação são obrigatórios. [Contrato](../contracts/privacidade.md).

## Nova aposta #29 — 15/10/2026

Criação manual, freebet e atribuição já existem na main. Falta identidade durável escolhida antes do pedido e consulta do resultado da criação após resposta perdida. UUID interno novo por POST não oferece idempotência HTTP; os testes de repositório da backend #36 não suprem esse protocolo. A #29 permanece bloqueada por essa entrega mínima, sem simular recuperação pela listagem ou inventar endpoint. [Auditoria](../audits/nova-aposta-2026-10-15.md). PR futura contra main com #94 e emergência backend declaradas; sem merge ou publicação.

## Nova aposta #29 — contrato entregue em 15/10/2026

Backend #202/PR #203 resolve a lacuna auditada. Consumidor preserva frontend #95/#94, usa sandbox único ec46748 (127 operações, hash 797c735e0fa6d63f46c3eb1635e569e434154dfc02fb17d27c940ff339cfcf96), sem schemas compostos ou promoção. UUID anterior ao POST, corpo em memória, confirmação autoritativa e recuperação explícita são obrigatórios. Mais seis jornadas reais e 44 aceites API se somam aos inventários anteriores. O job central reserva 30 minutos para 54 jornadas, mantendo timeouts individuais, cobertura, budget e zero skips. [Contrato](../contracts/nova-aposta.md).

## E2E de entrada #30 — 15/10/2026

Preservar o pin ec46748 e a frontend #96, com PR contra main e dependências declaradas. A cobertura liga Print recebido à Revisão e à aposta atribuída, confirma planilha após perda de resposta, e prova export com 429 real e POST confirmado cuja resposta não chega à SPA. Não alterar relógios/limites nem tratar listagem como reconciliação do export legado sem UUID. Os inventários existentes permanecem; seis casos de export em matriz isolada de 15 minutos ampliam as 54 jornadas para 60. Nenhuma tela nova, decisão financeira local ou aprovação de gasto. Traces usam projeção permitida de metadados, sem argumentos/resultados/rede; falha de sanitização impede publicação do ZIP bruto e um gate verifica os artefatos antes de upload. [Matriz e diagnóstico](../contracts/entrada.md).

## Ajuda #35 — parcela adiantada em 16/10/2026

Enquanto #34 aguarda leitura web de sessão, adiantar Tutorial/Extensão públicos e ajuda contextual do Excel, sobre frontend #97, contra main. Reutilizar download e contratos de entrada existentes, sem dados privados na ajuda ou promessa de coleta disponível. A extensão não tem release em ff62454: informar Esperando lançamento, sem binário/checksum inventados ou instalação do protótipo. A #35 permanece aberta pela distribuição verificável e reconciliação com #34. A prova real existente amplia-se para baixar/abrir Excel pela SPA, sem alterar pin, inventário, gates ou timeouts. [Contrato](../contracts/ajuda.md).

## Coleta #34 e complemento da #35 — 16/10/2026

Backend #204/PR #205 entrega a projeção web. Consumir uma única árvore real 86c82c9 (127 operações, hash f486d9af983fcea52a087ec78aefedbfd3e65bdf30bf237a8f5b124a473d1595), preservando ec46748 e todas as fontes anteriores. Gestão em READ_ONLY com controles próprios por instalação, segredos transitórios e nenhuma simulação de presença, fronteira ou materialização. Acrescentar seis jornadas reais/26 aceites API sem remover gates anteriores; o novo workflow separado não altera os timeouts dos existentes. Contra main, dependente da frontend #98 e backend #205/fontes do pin. A ajuda da #35 passa a orientar a Coleta implementada; resta release pública verificável da extensão (#16/PR #25), que a API não publica. [Coleta](../contracts/coleta.md), [Ajuda](../contracts/ajuda.md). Sem merge, deploy ou promoção de sandbox.

## Análises #56 — 17/10/2026

Adiantar a #56 enquanto o backend prepara a correção de confirmação da troca de conta #53. Análises e evolução ampliada já integradas em b916f54 (#158); preservar o sandbox único 86c82c9 e seus consumidores. O titular escolheu a proposta A após comparar barras/tabela expansível e tabela compacta nos dois viewports. Resumo/partições usam uma resposta; caixa tem população e frescor explicitamente separados, com linhas interrompidas em null e valores recebidos. Não adicionar filtros ou acumular dinheiro no cliente. Futura PR contra main com frontend #99/fontes do pin declaradas, seis jornadas reais adicionais sem skips, inventários/gates anteriores preservados. [Contrato de Análises](../contracts/analises.md).

## Troca temporal #53 — auditoria de 17/10/2026

A #36 depende das capacidades pendentes #53/#56/#57/#59, além da distribuição verificável na #35. Iniciar pela #53, que completa Contas e titulares. O motor de troca e a idempotência já estão integrados em b916f54, mas a aplicação não compara a evidência de impactos com a prévia apresentada; o hash cobre somente o pedido. Corrigir essa confirmação no servidor antes de concluir a tela, preservando replay de aplicação confirmada, atribuição temporal e explícita, e o pin sandbox único 86c82c9 até a entrega de uma árvore reconciliada. [Auditoria estática e limites](../audits/troca-conta-2026-10-17.md). Solicitação emergencial preparada; não há PR frontend pronta, merge ou publicação.

## Troca temporal #53 — retomada após entrega em 17/10/2026

Backend #206/PR #207 corrigiu a evidência e publicou GET da mesma intenção; candidato 132ee915 tem 26 checks verdes. A árvore real 5f5f062 descende do pin completo, tem 128 operações e preserva todas as fontes, sem união de schemas. Atualizar tipos e todos os ensaios para esse mesmo pin, mantendo disponibilidade sandbox e publicação bloqueada. A SPA oferece matriz elegível, instante/fuso e estado explícitos, prévia e confirmação separadas e consulta de recibo em READ_ONLY; nenhum POST é repetido automaticamente. IDs afetados são indicação para revisão, sem migração ou dinheiro alterado. UUID/corpo/recibos somente em memória; a regra de sessão e o contrato da API excluem URL/storage da intenção. Consulta após recarga exige código guardado por gesto anterior, sem reconstruir corpo. PR contra main, dependente da frontend #100/#99 e backend #207/fontes; acrescentar seis jornadas reais e 34 aceites API sem skips ou remoção dos inventários/gates anteriores. [Contrato](../contracts/troca-conta.md). Revisão/merge pelo administrador.

## Metas e fuso #57 — 17/10/2026

Consumir as metas integradas em b916f54, preservadas no pin completo 5f5f062 e em todos os ensaios. Não há lacuna de endpoint a inventar: progresso, valor atual e alvo atingido são exclusivos da API; os decimais legados de configuração são formatados exatamente. A seção é opcional, sem metas padrão, e explicita sua população global/intervalo próprio, distinta dos filtros de Painel preservados no endereço. Lista inclui arquivadas, status é visualização na URL, DELETE confirma e arquiva. O POST legado não tem intenção/recibo; resposta perdida não autoriza replay nem reconciliação por lista/título. GET atual após PATCH/DELETE incertos antecede nova edição sem prova de autoria/rollback. FusoPreferencia é o mesmo recurso de Configurações, sem preferência local ou reescrita histórica. Seis jornadas reais adicionais nos três browsers/dois viewports e todos os inventários anteriores; publicação continua bloqueada. PR contra main com dependências #101/#100/#80 e antecedentes. [Contrato](../contracts/metas.md).
