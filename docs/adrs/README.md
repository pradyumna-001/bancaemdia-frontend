# Architecture Decision Records (ADRs) — bancaemdia-frontend

Numeração própria deste repositório, a partir de 001. ADRs de alto nível que regem o produto inteiro (SLA, transações, pipelines do backend) vivem em `pradyumna-001/bancaemdia-api/docs/adrs/`; aqui constam apenas decisões do cliente.

## Registros de Decisão

| #   | Title                                                                                  | Status             | Date       |
| --- | -------------------------------------------------------------------------------------- | ------------------ | ---------- |
| 001 | Atributos de Qualidade do Frontend — Core Web Vitals, A11y, Regras de Tela Mensuráveis | Revisado #8/ADR019 | 2026-09-29 |
| 002 | Stack — Vite + React + TypeScript Strict, TanStack Query, React Router                 | Proposed           | 2026-09-24 |
| 003 | Cliente da API, Tipagem e Sessão — OpenAPI-generated types, JWT externo, Polling 202   | Proposed           | 2026-09-24 |
| 004 | Estado, URL e Cache — URL como fonte dos filtros, política de cache                    | Proposed           | 2026-09-24 |
| 005 | Erros, Timeouts e Retry — Fallbacks de query params, 429/503, páginas de erro          | Proposed           | 2026-09-24 |
| 006 | Sistema visual — Legibilidade, tokens semânticos e SVG próprio                         | Accepted           | 2026-09-29 |
| 007 | Estratégia de Testes — Vitest + Testing Library + Playwright + lints de sistema        | Revisado #8/ADR019 | 2026-09-29 |
| 008 | CI, budgets e hospedagem estática — Fase 1 nginx/Compose/Caddy                         | Accepted           | 2026-09-29 |

---

## Cronogramas de Planejamento

| #   | Title                                           | Status   | Date       |
| --- | ----------------------------------------------- | -------- | ---------- |
| 013 | Escopo do Frontend — Tarefas do produto vigente | Proposed | 2026-09-24 |
| 014 | Semana 1 — Fundação (Issues)                    | Proposed | 2026-09-24 |
| 015 | Semana 2 — Auth e Cliente da API (Issues)       | Proposed | 2026-09-24 |
| 016 | Semana 3 — Telas Centrais (Issues)              | Proposed | 2026-09-24 |
| 017 | Semana 4 — Fluxos de Entrada (Issues)           | Proposed | 2026-09-24 |
| 018 | Semana 5 — Conta e Endurecimento (Issues)       | Proposed | 2026-09-24 |

Os ADRs 014–018 indexam as issues de origem histórica; os corpos vigentes vivem em `docs/backlog/` e correspondem às issues deste repositório. A execução segue dependências, não o cronograma antigo de cinco semanas.

[ADR 019 — Produto vigente, contratos e ordem de implementação](019-current-product-backend-alignment.md), aceito em 29/09/2026, atualiza o escopo e cria #49–59 após auditoria do backend.

---

## Revisão do backlog após pesquisa

Em 29/09/2026, as 39 issues e seus textos nos ADRs 014–018 foram alinhados à [direção visual aprovada](../research/visual-direction.md). Os [critérios comuns](../research/backlog-visual.md) complementam o aceite específico de cada issue; referências ao monólito preservam funcionalidade e dados, não a aparência rejeitada.

## Process

1. **Create** new ADR from template (MADR elaborate format)
2. **Review** with stakeholders (async or sync)
3. **Accept** → merge to main, update this index
4. **Implement** → reference in PRs: "Implements ADR-XXX"
5. **Supersede** when changed: new ADR, mark old `Superseded by ADR-YYY`

## Template

Use ADRs 001–008 as the decision-record convention and ADRs 014–018 as the established milestone/issue-body convention. New planning documents must preserve the `Labels`, `Size`, `Files`, `Tasks`, and `Acceptance` structure.
