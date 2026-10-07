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
