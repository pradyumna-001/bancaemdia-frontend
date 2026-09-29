# Runbook — Deploy (bancaemdia-frontend)

Deploy de SPA estático (artefato `dist/`) na plataforma definida em ADR 008.

## HTML e CSP da aparência

`pnpm build` gera `dist/` e `dist-security/default.conf`. A segunda saída contém o hash SHA-256 exato do único script inline de tema inserido pelo Vite. O Docker copia essa configuração gerada; `nginx/default.conf` no repositório é apenas o template, com marcador `__THEME_HASH__`.

Publicar HTML e configuração como uma unidade. Não editar/minificar o HTML depois do build nem copiar o template diretamente para produção. Outro provedor deve transportar a mesma política e hash para seus headers. Mudanças no controlador exigem novo build; jamais adicionar `unsafe-inline` para contornar falhas.

Na verificação: escolher Escuro, recarregar, confirmar `data-tema="escuro"` antes do React e ausência de violações CSP. As fontes vêm de `/fontes/` na mesma origem; fonte inexistente deve retornar 404. `tests/verify-nginx.mjs` cobre a política real no contêiner, além dos testes de primeira pintura e preferência em Playwright.

## Pré-requisitos

- CI verde na tag/commit (lint, typecheck, test, build, lighthouse, e2e)
- Artefato imutável do workflow (nome contém o SHA do commit)
- Config do ambiente revisada (`VITE_API_URL` apontando para o ambiente certo)

## Staging

1. Merge em `main` dispara CD automaticamente.
2. Verificar: banner de ambiente visível, `GET /health` da API alvo 200, console sem violação de CSP.

## Produção

1. Criar tag `v0.x.y` a partir de `main` → workflow de release.
2. Conferir headers de segurança no domínio:
   - `Content-Security-Policy` sem `unsafe-inline` de script externo / sem CDN
   - `Cache-Control: immutable` em assets hasheados; `index.html` com `no-cache`
   - `X-Content-Type-Options: nosniff`, `Referrer-Options: same-origin`
3. Smoke pós-deploy: login → início carrega números → painel renderiza → export baixa.
4. Anunciar no canal do projeto com tag + changelog.

## Falha no deploy

- Se o smoke falhar: executar `rollback.md` imediatamente (alvo < 7 min).
- Abrir issue `incident` com timestamp, tag e sintoma.
