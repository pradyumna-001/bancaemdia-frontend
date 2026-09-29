# ADR 007: Estratégia de Testes — Vitest + Testing Library + Playwright + Lints de Sistema

## Status

Proposed

## Context

O monólito impunha disciplina de frontend por testes Python (paleta única, ícone registrado, ABAS↔macro, rotas abertas). O backend novo tem `pytest` + Testcontainers como gate. O SPA precisa de cobertura equivalente em camadas, mais os testes das regras de tela mensuráveis (ADR 001).

## Decision

### Camadas

| Camada      | Ferramenta                                                         | Escopo                                                                            |
| ----------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Unit        | Vitest                                                             | `lib/` (formatadores, params, termos), reducers de fluxo, geometria dos SVGs      |
| Component   | Vitest + Testing Library                                           | Telas e componentes com MSW mockando `/api/v1`; axe-core em cada tela (a11y gate) |
| Contract    | MSW handlers gerados/che cados contra `openapi.json`               | CI falha se handler divergir do schema (drift de contrato)                        |
| e2e         | Playwright (Chromium/Firefox/WebKit, viewports 390×844 e 1440×900) | Fluxos críticos contra API de teste (staging ou backend docker)                   |
| Visual/Lint | ESLint custom + snapshot                                           | Cor fora de token (ADR 006), ícone não registrado, ABAS fonte única               |

### Fluxos e2e obrigatórios (gate de release)

1. Login → início com números carregados.
2. Filtrar apostas → pílulas aparecem → URL reflete → reload preserva.
3. Resultados: 20 resultados em 20 toques, sem reload (regra §1-bis), com desfazer da sessão.
4. Enviar: upload → polling de progresso → cartão de autorização → conclusão.
5. Revisão: abrir bilhete, corrigir campo, resolver → sai da fila e contador do menu atualiza.
6. Apagar e restaurar aposta; visão `?apagadas=1` persistente em navegação.
7. Erros: 429, 503, offline simulados (ADR 005 matriz).
8. Aparência Sistema por padrão, Claro/Escuro explícitos persistidos, aplicação sem flash, sincronização e storage bloqueado (ADR 006).

### Gates

- PR: lint + typecheck + unit + component + Lighthouse CI (ADR 001 budgets).
- PR e merge/release: todos os checks aplicáveis, incluindo o e2e existente, verdes no SHA final; entrega fora de rascunho conforme AGENTS 28.
- Cobertura: linhas ≥ 80% em `src/lib` e `src/features` (iguala cultura do backend); sem cobertura obrigatória em `graficos/` além de unit de geometria.

### Evidência visual e de uso

Aplicar os [critérios comuns do backlog](../research/backlog-visual.md): capturas móvel/desktop nos dois temas, teclado/foco e inspeção de reflow a 320px. Comparar tarefas e dados com o monólito; não usar screenshots antigos como gabarito da aparência. Axe e screenshots não substituem avaliação de tarefas com participantes nem comprovam sozinhos conformidade integral.

## Consequences

- MSW handlers são única fonte de mocks de componente → mock errado é bug rastreável.
- e2e é a encarnação automatizada das regras §1-bis/DESIGN; nova regra de tela exige teste no mesmo PR.
- Custo: Playwright em CI é o passo mais lento; mitigar com sharding (8 workers, espelhando `pytest -n 8`).
