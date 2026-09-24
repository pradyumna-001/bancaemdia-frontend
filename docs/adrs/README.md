# Architecture Decision Records (ADRs) — bancaemdia-frontend

Numeração própria deste repositório, a partir de 001. ADRs de alto nível que regem o produto inteiro (SLA, transações, pipelines do backend) vivem em `pradyumna-001/bancaemdia-api/docs/adrs/`; aqui constam apenas decisões do cliente.

## Registros de Decisão

| # | Title | Status | Date |
|---|-------|--------|------|
| 001 | Atributos de Qualidade do Frontend — Core Web Vitals, A11y, Regras de Tela Mensuráveis | Proposed | 2026-09-24 |
| 002 | Stack — Vite + React + TypeScript Strict, TanStack Query, React Router | Proposed | 2026-09-24 |
| 003 | Cliente da API, Tipagem e Sessão — OpenAPI-generated types, JWT externo, Polling 202 | Proposed | 2026-09-24 |
| 004 | Estado, URL e Cache — URL como fonte dos filtros, política de cache | Proposed | 2026-09-24 |
| 005 | Erros, Timeouts e Retry — Fallbacks de query params, 429/503, páginas de erro | Proposed | 2026-09-24 |
| 006 | Sistema Visual — Tokens de paleta, tipografia vendida, SVG próprio (sem chart lib) | Proposed | 2026-09-24 |
| 007 | Estratégia de Testes — Vitest + Testing Library + Playwright + lints de sistema | Proposed | 2026-09-24 |
| 008 | CI/CD e Deploy — GH Actions lint→typecheck→test→build, SPA deploy, rollback | Proposed | 2026-09-24 |

---

## Cronogramas de Planejamento

| # | Title | Status | Date |
|---|-------|--------|------|
| 013 | Escopo do Frontend — Paridade com o Monólito, 5 Semanas | Proposed | 2026-09-24 |
| 014 | Semana 1 — Fundação (Issues) | Proposed | 2026-09-24 |
| 015 | Semana 2 — Auth e Cliente da API (Issues) | Proposed | 2026-09-24 |
| 016 | Semana 3 — Telas Centrais (Issues) | Proposed | 2026-09-24 |
| 017 | Semana 4 — Fluxos de Entrada (Issues) | Proposed | 2026-09-24 |
| 018 | Semana 5 — Conta e Endurecimento (Issues) | Proposed | 2026-09-24 |

Os corpos das issues das semanas 1–5 vivem nestes ADRs e são criadas como GitHub Issues **deste repositório** (`pradyumna-001/bancaemdia-frontend`), com milestones por semana.

---

## Process

1. **Create** new ADR from template (MADR elaborate format)
2. **Review** with stakeholders (async or sync)
3. **Accept** → merge to main, update this index
4. **Implement** → reference in PRs: "Implements ADR-XXX"
5. **Supersede** when changed: new ADR, mark old `Superseded by ADR-YYY`

## Template

Use ADRs 001–008 as the decision-record convention and ADRs 014–018 as the established milestone/issue-body convention. New planning documents must preserve the `Labels`, `Size`, `Files`, `Tasks`, and `Acceptance` structure.
