# ADR 002: Stack — Vite + React 18 + TypeScript Strict, TanStack Query, React Router

## Status
Proposed

## Context

O backend foi refatorado como API desacoplada (FastAPI, `/api/v1`, contratos em `docs/API.md`). O frontend precisa ser um repositório separado com cultura equivalente: tipagem estrita, testes, CI verde obrigatório. Opções consideradas:

1. **Vite + React + TypeScript SPA** — build simples, dev rápido, SPA encaixa com UI autenticada sem necessidade de SEO.
2. **Next.js** — SSR/híbrido; traz SEO indesejado em app logado, mais superfície de deploy (servidor Node/edge), atrito para contratos 202/polling.
3. **Manter HTMX servido pelo backend** — rejeitado explicitamente pelo backend ADR-013 (frontend em repositório separado, não-objetivo manter templates no monólito).
4. **Vue/Svelte + Vite** — mesma classe da opção 1; sem ganho decisivo para este produto.

## Decision

Adotar **opção 1**:

- **Build/dev**: Vite 6, `pnpm`.
- **UI**: React 18, JSX.
- **Tipo**: TypeScript 5 em modo `strict` + `noUncheckedIndexedAccess`, sem `any` sem justificativa (eslint).
- **Rotas**: React Router 7 (modo data router — loaders/actions encorajados para get/mutations simples).
- **Estado de servidor**: TanStack Query (cache, dedupe, retry, refetch controlado) — ver ADR 004.
- **Estado de cliente**: hook/context local; introduzir Zustand **somente** se um fluxo (Resultados) precisar, por ADR suplantador.
- **Não usar**: biblioteca de gráficos (ADR 006), Tailwind/Bootstrap (sistema visual próprio, ADR 006), componente de datepicker/select nativo (regra de design).
- **Gráficos/ilustrações/ícones**: SVG escrito à mão componentizado.

## Consequences

- Sem SSR: SEO não importa; páginas públicas (tutorial/extensão) carregam dentro do SPA atrás de rota aberta.
- Toolchain simples → CI rápido (ADR 008); `tsc --noEmit` como gate espelha `mypy` do backend.
- Risco de fan-out de bibliotecas React é controlado pela regra "dependência nova exige ADR ou justificativa no PR".
