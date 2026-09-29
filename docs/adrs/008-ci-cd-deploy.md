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

#### CI básica adotada em 29/09/2026

Por instrução explícita do dono após o PR #42, a CI básica passa a ser permanente em `.github/workflows/ci.yml`, antecipando esta parte da #8. Executa em push e pull request, inclusive alterações documentais, e valida o SHA da branch do PR: lint, tipos, testes unitários/componentes, build, geração de contrato sem drift, e2e nos seis pares browser/viewport, pre-commit e verificação do nginx em Docker. A entrega exige PR fora de rascunho e todos os checks concluídos com sucesso após o último push, incluindo integrações externas.

Não se remove mais o workflow após uma validação pontual nem se usa um commit anterior como substituto da validação final. Checks externos fora do controle do agente devem ser relatados como pendência, sem declarar o PR pronto. Budgets, cobertura mínima, sharding, proteção de branch e plataforma de deploy continuam na #8; esta decisão não declara esses itens implementados.

### CD (main)

- Deploy automático para **staging**; canário manual/percentual para produção se a plataforma escolhida suportar (espelho do backend PR→staging→canary→prod).
- Releases versionados por tag `v0.x.y`; `dist/` nomeado com hash de commit para rollback instantâneo.
- Rollback: republicar artefato anterior **<7 min** (runbook `docs/runbooks/rollback.md`).

### Headers (servidor estático)

- `Content-Security-Policy` estrita (sem CDN de script/fonte; conexões apenas para `VITE_API_URL`/emissor de auth), `X-Content-Type-Options`, `Referrer-Options`, cache imutável em assets com hash, `index.html` sem cache.
- SPA fallback: todas as rotas → `index.html` (404 real apenas via UI — ADR 005).

### Configuração por ambiente

- Decisão da #2: o build publicado lê `/config.json` antes de montar a aplicação. Esse JSON público sobrescreve somente `VITE_API_URL`, `VITE_APP_ENV` e `VITE_UPLOAD_POLL_MS` do build; `{}` mantém os valores do build. Em desenvolvimento, somente `import.meta.env` é usado.
- O mesmo `dist/`/imagem pode ser promovido entre ambientes substituindo apenas o arquivo JSON. No Compose, o arquivo é montado somente para leitura (`FRONTEND_CONFIG_FILE`, padrão `config/local.json`). Não há interpolação de segredos ou geração de JavaScript no container.
- `VITE_API_URL` é obrigatória; ambiente omitido usa `development` no dev server e `production` no build; intervalo omitido usa 1000 ms. Configuração ausente/inválida impede o boot, com mensagem em português e ação de tentar novamente. A validação é feita após aplicar a precedência, para permitir um build sem URL promovido por configuração runtime.
- `/config.json` usa `Cache-Control: no-store`, não recebe fallback HTML, e sua leitura tem timeout de 5 segundos, sem tentativas automáticas ou fallback silencioso em falhas. JSON inválido, campos desconhecidos e falhas HTTP/rede abortam o boot.
- O arquivo não altera a CSP: a allowlist de origens da API/auth deve ser ajustada no servidor ao integrar esses clientes. A #2 mantém a política estrita existente; não escolhe plataforma de deploy nem implementa a CI permanente.

## Consequences

- Deploy frontend é independente do backend e mais barato (estático); a compatibilidade de contrato é garantida pelos tipos gerados + contract tests (ADR 003/007), não por deploy conjunto.
- Rollback trivial (reapontar artefato) — condição para aprovar mudanças maiores na Semana 5.
