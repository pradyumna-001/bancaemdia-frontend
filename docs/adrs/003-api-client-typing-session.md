# ADR 003: Cliente da API, Tipagem e Sessão — OpenAPI-generated types, JWT externo, Polling 202

## Status

Proposed

## Context

A API (`bancaemdia-api` ADR-004, 008) é versionada por path (`/api/v1`), serializa JSON, autentica via **JWT RS256 validado por JWKS externo** (`JWT_JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE` — não há endpoints de login/signup na `docs/API.md`). Operações pesadas (upload de exportação Telegram) são assíncronas: `POST /api/v1/upload` → `202` + `job_id` → polling em `GET /api/v1/upload/{job_id}` (ADR-011 do backend). Erros normalizados por status (401/404/409/413/422/429/500/503).

A UI antiga tinha fluxo completo de conta (login, criar conta com código de convite, recuperar senha, confirmar e-mail). Em v2, identidade é do provedor emissor de JWT, a definir. **Decisão do provedor é lacuna de produto no backend** — este ADR fixa o desenho do cliente sem escolher provedor, e a lacuna é registrada em `docs/API-CONTRACTS.md` e em issue da Semana 2 (ADR 015).

## Decision

1. **Tipos gerados, nunca escritos à mão**: `openapi-typescript` gera `src/api/schema.d.ts` do `/openapi.json` da API; script `make gen-types`; regenerar é passo obrigatório quando a issue do backend altera contrato (mesmo gate do ADR 021 da API: fixtures/contrato primeiro).
2. **Cliente único**: `src/api/client.ts` — wrapper sobre `fetch` tipado pelo `openapi-fetch`:
   - Base de `VITE_API_URL`; timeout 10s (GET) / 60s (upload); `AbortSignal` por rota-troca.
   - Anexa `Authorization: Bearer <token>` via injetor fornecido pela sessão.
   - Normaliza erro em `ApiError { status, code?, detail }`; **nunca** propaga corpo cru para componentes.
   - 429: respeita `Retry-After`; 503: retry com backoff (máx. 3, exponencial, jitter) só em GET idempotente.
   - 401: aciona fluxo de reautenticação; se falhar, redireciona a login com `destino` interno (guard open-redirect — AGENTS regra 23).
3. **Sessão**: camada `src/auth/` agnóstica de provedor:
   - Interface `ProvedorAuth { token(): Promise<string>; login(); logout(); emInteracao }`.
   - **Decisão padrão sujeita à definição do backend**: token em memória + refresh via cookie `HttpOnly` do provedor (ou Authorization Code + PKCE quando provedor hosted). Proibido persistir access token em `localStorage` quando o provedor permitir alternativa; a decisão final materializa-se em ADR suplantador assim que a API publicar o emissor.
   - Redirects pós-login validados contra allowlist de rotas internas (`destinoInterno`), espelhando o guard do monólito.
4. **Polling 202**: hook `useJob(jobId)` encapsula polling de `/api/v1/upload/{job_id}` começando em `VITE_UPLOAD_POLL_MS` (1000), backoff exponencial após 10s sem mudança de estado, cancel on unmount, e estado "autorização de gasto pendente" como estado de primeira classe da UI (cartão do pode — ver ADR 017).
5. **Paginação**: cursores/offsets conforme contrato; "Mostrar mais" acumulativo (paridade com o monólito).

## Consequences

- Contrato da API vira código: quebra de contrato falha em `tsc`, não em produção.
- Escolha do provedor de identidade fica desacoplada; a UI de conta (login/signup/senha) é implementada contra a interface `ProvedorAuth`, e telas de recuperar senha/confirmar e-mail serão redirecionamentos para o provedor quando hosted (issue de confirmação aberta no backend — ver API-CONTRACTS).
- Polling encapsulado evita componentes reimplementando timers (bug clássico: múltiplos intervalos).
