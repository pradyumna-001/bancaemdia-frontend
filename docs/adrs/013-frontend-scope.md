# ADR 013: Escopo do frontend — tarefas do produto vigente

## Status

Revisado em 29/09/2026 pelo ADR019. Substitui o limite anterior de paridade com o monólito em cinco semanas.

## Objetivo

Permitir registrar, conferir e entender apostas e dinheiro por conta/titular, conectar canais de entrada e gerir acesso/privacidade com os contratos reais de bancaemdia-api. A [pesquisa visual](../research/visual-direction.md) e ADR006 continuam vigentes; simplicidade organiza a informação, não elimina capacidades.

## Inventário

| Área                | Tarefas                                                         | Issues                        |
| ------------------- | --------------------------------------------------------------- | ----------------------------- |
| Fundação            | configuração, rotas, marca, shell, gráficos, CI                 | #1–8; correção #48            |
| Identidade e acesso | usuário interno, cadastro/login, erros, assinatura e leitura    | #9–14, #49, #51–52            |
| Contas e titulares  | pessoas, contas por casa, matriz, histórico, ativar e trocar    | #32, #53                      |
| Apostas             | filtros, lista, detalhe, origem, correções, manual e resultados | #16–19, #22, #27, #29         |
| Revisão             | leitura, atribuição de conta, pares e evidências                | #28; #19                      |
| Caixa               | saldo/exposição, movimentos, transferência atômica e banca      | #31                           |
| Painel              | resumo, séries, análises, metas e fuso                          | #20, #56–57                   |
| Ferramentas         | quatro calculadoras com resultado da API                        | #55                           |
| Entrada             | arquivo Telegram, prints web, XLSX com prévia, acompanhamento   | #15, #24–26                   |
| Conexões            | vínculo bot, instalações da extensão e coleta                   | #34, #54                      |
| Conta               | preferências, assinatura, exportação pessoal, encerramento      | #33, #51, #58                 |
| Ajuda/primeiro uso  | orientação contextual, canais, download, Excel do Painel        | #35, #59                      |
| Qualidade/release   | e2e, budgets/a11y, auditoria de cobertura e deploy              | #23, #30, #36–39              |
| Contratos pendentes | lacunas rastreadas e capacidade por versão                      | #50; #21 Hipotética bloqueada |

## Arquitetura de informação

ABAS define destinos e apresentação desktop/mobile. Apostas/Painel/Enviar diretos no celular; Revisão só com fila; Mais para os demais. Contas e titulares, Calculadoras, Assinatura e Configurações ficam no menu secundário também no desktop. Análises/Metas são detalhes do Painel; Conexões/Privacidade pertencem a Configurações. Caixa mantém `/banca`; domínio banca é distinto de titular/conta/casa.

## Limites

- Nenhum cálculo financeiro, parsing de captura, matching, controle de saldo ou atribuição de conta no cliente.
- Conversa/rascunho do bot permanece no Telegram; site conecta e orienta. Captura/outbox/permissões pertencem à extensão, não à SPA.
- Infra/CLI/admin não viram telas comuns. Operações recebendo apostas/fundos não fazem parte do produto.
- Calculadora de linhas arquivada para pós-lançamento por decisão do titular em 06/10/2026. Não é dependência do escopo atual; [arquivo](../archive/post-launch/line-calculator.md). A pesquisa histórica backend #104 permanece No-Go.
- Hipotética não é removida silenciosamente, mas requer contrato/prioridade; não integra lançamento por um placeholder.
- PWA/offline financeiro, notificações push, marketing/SSR e novas capacidades não descritas continuam fora do escopo desta revisão.

## Dependências e saída

[API-CONTRACTS](../API-CONTRACTS.md) distingue main, PR e lacuna. [ADR019](019-current-product-backend-alignment.md) define precedência e ordem; [backlog](../backlog/README.md) contém aceites. A saída é cobertura do produto selecionado com contratos integrados, evidências nos dois viewports e bloqueios/adiamentos explicitamente aprovados. Não basta reproduzir rotas antigas ou obter mock verde.
