# ADR 018: Contas e qualidade — índice de issues revisadas

## Status

Revisado em 29/09/2026 pelo [ADR019](019-current-product-backend-alignment.md). A antiga divisão por semana é histórica; executar por dependências, sem prazo de cinco semanas presumido.

## Issues

| GitHub | Escopo canônico                                                                    | Estado de planejamento                  |
| ------ | ---------------------------------------------------------------------------------- | --------------------------------------- |
| #31    | [Caixa — movimentos e saldos por conta e banca](../backlog/031.md)                 | Contrato/dependências no corpo canônico |
| #32    | [Contas e titulares — cadastro, matriz e histórico](../backlog/032.md)             | Contrato/dependências no corpo canônico |
| #33    | [Configurações — preferências com efeito explícito](../backlog/033.md)             | Contrato/dependências no corpo canônico |
| #34    | [Coleta — pareamento e instalações da extensão](../backlog/034.md)                 | Contrato/dependências no corpo canônico |
| #35    | [Ajuda e exportação — canais atuais e arquivos corretos](../backlog/035.md)        | Contrato/dependências no corpo canônico |
| #36    | [E2E completo — produto integrado e permissões](../backlog/036.md)                 | Contrato/dependências no corpo canônico |
| #37    | [Performance e acessibilidade — todas as áreas do produto](../backlog/037.md)      | Contrato/dependências no corpo canônico |
| #38    | [Produção e rollback — artefatos e contratos compatíveis](../backlog/038.md)       | Contrato/dependências no corpo canônico |
| #39    | [Auditoria final — cobertura do produto e aceite de lançamento](../backlog/039.md) | Contrato/dependências no corpo canônico |

## Regras comuns

Cada corpo preserva Labels, Size, Files, Tasks e Acceptance, incluindo contrato/disponibilidade e critérios visuais. [Backlog completo](../backlog/README.md), [contratos](../API-CONTRACTS.md), [pesquisa](../research/backlog-visual.md). A antiga cópia dos corpos foi substituída por referências para impedir divergência entre ADRs, GitHub e planejamento. Histórico permanece no Git.

## Configurações (#33) — implementação de 10/10/2026

A página organiza aparência, fuso das análises e destinos de conta. O fuso usa o contrato integrado b916f54 e FusoPreferencia compartilhado com #57; não altera dinheiro nem o fuso do formatador global. Tema reutiliza ADR006. Odd/unidade/e-mail sem persistência permanecem no planejamento. Privacidade está identificada como preparação e sua entrega funcional pertence à #58. Ver [contrato e provas](../contracts/configuracoes.md). PR independente contra main, dependências #69/#75/#76/#77/#79 declaradas.
