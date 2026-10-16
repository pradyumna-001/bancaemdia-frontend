# ADR 016: Telas centrais — índice de issues revisadas

## Status

Revisado em 29/09/2026 pelo [ADR019](019-current-product-backend-alignment.md). A antiga divisão por semana é histórica; executar por dependências, sem prazo de cinco semanas presumido.

## Issues

| GitHub | Escopo canônico                                                                    | Estado de planejamento                  |
| ------ | ---------------------------------------------------------------------------------- | --------------------------------------- |
| #16    | [Formatadores e termos — domínio financeiro e assinatura](../backlog/016.md)       | Contrato/dependências no corpo canônico |
| #17    | [Filtros na URL — capacidade por recurso e paginação real](../backlog/017.md)      | Contrato/dependências no corpo canônico |
| #18    | [Apostas — lista operacional com resumo coerente](../backlog/018.md)               | Contrato/dependências no corpo canônico |
| #19    | [Aposta — detalhe, correções, origem e atribuição](../backlog/019.md)              | Contrato/dependências no corpo canônico |
| #20    | [Painel — resumo financeiro e séries canônicas](../backlog/020.md)                 | Contrato/dependências no corpo canônico |
| #21    | [Hipotética — comparação histórica seguindo a stake do tipster](../backlog/021.md) | Contrato/dependências no corpo canônico |
| #22    | [Mídia de aposta — autorização e estabilidade visual](../backlog/022.md)           | Contrato/dependências no corpo canônico |
| #23    | [E2E central — filtros, contas, revisão e resumos](../backlog/023.md)              | Contrato/dependências no corpo canônico |

## Regras comuns

Atualização #22 (11/10/2026): foto por recurso autorizado foi publicada como candidata backend #193/#192. Visualizador e componente usam essa árvore inteira; preservam revisão resolvida, READ_ONLY, ausência segura e retenção. Detalhe #84 e demais candidatos continuam separados. [Contrato e provas](../contracts/foto-aposta.md); integrar consumidor e pin único antes de publicação.

Cada corpo preserva Labels, Size, Files, Tasks e Acceptance, incluindo contrato/disponibilidade e critérios visuais. [Backlog completo](../backlog/README.md), [contratos](../API-CONTRACTS.md), [pesquisa](../research/backlog-visual.md). A antiga cópia dos corpos foi substituída por referências para impedir divergência entre ADRs, GitHub e planejamento. Histórico permanece no Git.

Atualização #20 (11/10/2026): proposta aprovada e consumo da candidata backend #189 autorizado pelo titular, com dependências contra main e sem schema composto. Diário/grupos/Excel e seus limites estão em [contrato do Painel](../contracts/painel.md). Prova de sandbox não autoriza deploy; integração/reconciliação continua obrigatória.

Atualização #21 (11/10/2026): prioridade do titular e contrato histórico candidato #191/#190. Página secundária /e-se, API decide valores/diferenças, READ_ONLY permitido e nulos explícitos. Pin único #191, sem #189/#187; integrar/reconciliar com #20 depois dos merges. Ver [Hipotética](../contracts/hipotetica.md).

## Ensaio central #23 autorizado em 11/10/2026

O titular autorizou tratar as entregas candidatas como um conjunto para implementar a #23 antes do merge. O código real é reconciliado em uma única árvore imutável; seu OpenAPI é gerado pelo aplicativo. Nenhum schema composto. A CI central separada executa dois fluxos em três navegadores e dois viewports (12 casos), mais os gates reais de filtros, projeção, Painel e foto. A CI de identidade conserva 16 casos SPA e 9 backend, sem skips. Fonte candidata não é prova de integração à main nem deploy; o gate continua bloqueando publicação e o pin/jornada serão reconciliados após o administrador integrar. Ver [contrato de E2E central](../contracts/e2e-central.md).
