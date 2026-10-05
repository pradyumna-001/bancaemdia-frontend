# ADR 008: CI/CD e Deploy — GH Actions lint→typecheck→test→build, SPA Deploy, Rollback

## Status

Proposed

## Context

O backend tem GitHub Actions `test → build → deploy` e rollback < 5min como alvo (HIGH_LEVEL_PLAN). O frontend é estático (Vite `dist/`): deploy é publicar artefato + servidor estático atrás de CDN, com headers de segurança. Plataforma alvo: escolher na Semana 1/5 entre AWS (S3+CloudFront, coeso com o backend ECS/ALB) ou Vercel/Cloudflare Pages (mais simples). **Decisão de plataforma fica na Issue de CI da Semana 1**, registrando resultado aqui por suplantação/adição.

## Decision

### CI (toda PR)

1. `lint` (eslint + prettier --check + lint de paleta/ícone)
2. `typecheck` (`tsc --noEmit`)
3. `unit + component` (vitest, coverage gate)
4. `build` (artefato `dist/` guardado como artifact do workflow)
5. `lighthouse` (budgets do ADR 001)
6. e2e Playwright shardado: gate de merge.

### CD (main)

- Deploy automático para **staging**; canário manual/percentual para produção se a plataforma escolhida suportar (espelho do backend PR→staging→canary→prod).
- Releases versionados por tag `v0.x.y`; `dist/` nomeado com hash de commit para rollback instantâneo.
- Rollback: republicar artefato anterior **<7 min** (runbook `docs/runbooks/rollback.md`).

### Headers (servidor estático)

- `Content-Security-Policy` estrita (sem CDN de script/fonte; conexões apenas para `VITE_API_URL`/emissor de auth), `X-Content-Type-Options`, `Referrer-Options`, cache imutável em assets com hash, `index.html` sem cache.
- SPA fallback: todas as rotas → `index.html` (404 real apenas via UI — ADR 005).

### Configuração por ambiente

- Sem rebuild entre staging/prod quando possível — env injetado em runtime via `public/config.json` ou build separado por ambiente (decisão na implementação; preferir config runtime para facilitar rollback).

## Consequences

- Deploy frontend é independente do backend e mais barato (estático); a compatibilidade de contrato é garantida pelos tipos gerados + contract tests (ADR 003/007), não por deploy conjunto.
- Rollback trivial (reapontar artefato) — condição para aprovar mudanças maiores na Semana 5.
