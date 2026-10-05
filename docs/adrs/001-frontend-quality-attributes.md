# ADR 001: Atributos de Qualidade do Frontend — Core Web Vitals, A11y, Regras de Tela Mensuráveis

## Status

Proposed

## Context

A UI original do monólito (`planilhador/web/`) tinha disciplina de qualidade incomum: spec aprovada pelo dono (SITE.md, "qualidade de tela é requisito, não polimento" §1-bis), ~30 regras R- mensuráveis extraídas de pesquisa visual (DESIGN.md), e testes Python barrando violações (paleta única, ícone registrado, ABAS↔macro, rotas abertas). O frontend SPA precisa carregar essas regras e adicionar alvos modernos web, alinhados aos SLAs do backend (ADR-001: painel P95 < 500ms lá implica UI que não detém o usuário aqui).

## Decision

| Atributo                                  | Alvo                                                                             | Validação                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **LCP**                                   | < 2.5s (P75, mobile 4G)                                                          | Lighthouse CI no PR; campo futuro via RUM                |
| **INP**                                   | < 200ms                                                                          | Lighthouse CI; e2e de Resultados mede tap→estado         |
| **CLS**                                   | < 0.1                                                                            | Mídia reserva espaço (AGENTS regra 9); checklist visual  |
| **Lighthouse (perf/a11y/best-practices)** | ≥ 95 cada                                                                        | Lighthouse CI falha o PR abaixo disso                    |
| **Acessibilidade**                        | WCAG 2.2 AA: foco visível, navegação por teclado, contraste ≥ 4.5:1              | axe-core nos testes de componente + auditoria Semana 5   |
| **Regras de tela mensuráveis**            | 1 toque = 1 resultado; zero estado morto; zero select/date nativo; zero JSON cru | Playwright e2e (ADR 007) — as regras §1-bis viram testes |
| **Compatibilidade**                       | Últimas 2 versões Chrome/Firefox/Safari; mobile primeiro                         | Playwright matrix                                        |
| **Tamanho de bundle**                     | JS inicial ≤ 200 KB gzip fora de vendor de gráficos (não há — ver ADR 006)       | `vite-bundle-visualizer` no CI com budget                |
| **Idioma**                                | pt-BR integral; vocabulário canônico (AGENTS regra 4)                            | Revisão + snapshot de termos                             |

## Consequences

- Regras de UX deixam de ser "senso estético" e viram gates de CI (como eram os testes de template no monólito).
- Números de SLA entram no backlog da Semana 5 (ADR 018) como issue de auditoria final.
- Qualquer exceção a alvo (ex.: carregar fonte maior) precisa de ADR suplantador.
