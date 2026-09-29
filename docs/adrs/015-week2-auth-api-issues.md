# Semana 2: Auth e Cliente da API — Milestones & GitHub Issues

## Milestone: **Semana 2 — Auth + Cliente Tipado da API + Erros**

**Target Date**: 7 days from Week 1
**Success Criteria**:

- [ ] Tipos da API gerados do OpenAPI; `make gen-types` integrado e checado no CI
- [ ] `client.ts` único com matriz de erros do ADR 005 implementada e testada
- [ ] Fluxo de autenticação completo contra provedor definido (lacuna backend resolvida ou credenciais de teste)
- [ ] Páginas de erro 404/405/500 e estados de erro estilizados em pt-BR
- [ ] Guard de rotas + redirect interno seguro funcionando

---

## GitHub Issues (7 issues)

### Issue 1: Tipos OpenAPI e Cliente Base

**Labels**: `semana-2`, `api`
**Size**: M (3-4 hours)

**Files**: `src/api/client.ts`, `src/api/schema.d.ts`, `scripts/gen-types.mjs`

**Tasks**:

- [ ] `make gen-types`: `openapi-typescript` contra `VITE_API_URL/openapi.json` (ou `openapi.json` baixado e commitado quando API offline) → `src/api/schema.d.ts`
- [ ] `client.ts` com `openapi-fetch`: base URL da config, timeouts (GET 10s / POST 15s / upload 60s), `AbortSignal` por navegação
- [ ] `ApiError { status, code?, detail }` — corpo nunca vaza cru para componentes
- [ ] CI job "contract drift": regenera tipos e falha se `git diff` não vazio
- [ ] Handlers MSW iniciais para todos os endpoints usados em Semana 3+ (a partir do schema)

**Acceptance**: alterar o schema quebra `tsc` onde a assinatura mudou; CI detecta drift de tipos

---

### Issue 2: Matriz de Erros e Retry

**Labels**: `semana-2`, `api`
**Size**: M (3-4 hours)

**File**: `src/api/errors.ts` + integração `client.ts`/`QueryClient`

**Tasks**:

- [ ] Implementar tabela status→comportamento do ADR 005 (401 reauth, 409 reload, 413 limite, 429 `Retry-After` com banner e lock de ações, 500 retry 1×, 503 backoff máx 3 com jitter, offline com indicador)
- [ ] Componentes de banner/estado de erro compartilhados (`<ErroApi />`) em pt-BR
- [ ] Testes de componente com MSW para cada status
- [ ] Nenhuma string de erro vinda crua da API aparece na tela (teste)

**Acceptance**: MSW simulando 429/503/offline gera as UIs previstas; telemetria mínima (console estruturado) registra status

---

### Issue 3: Camada de Autenticação (`ProvedorAuth`)

**Labels**: `semana-2`, `auth`
**Size**: L (4-6 hours)

**Files**: `src/auth/`

**Tasks**:

- [ ] **Pré-requisito**: backend define provedor de identidade (issue no repo da API — ver `docs/API-CONTRACTS.md`); se indefinido, implementar contra mock local atrás da mesma interface
- [ ] Interface `ProvedorAuth` (ADR 003): `token()`, `login()`, `logout()`, estado de interação; implementação para o provedor escolhido
- [ ] Guard de rotas com `destino` validado contra allowlist de paths internos
- [ ] Injetor de `Authorization` no `client.ts`; renovação de token transparente; 401 global → logout limpo (sem loop)
- [ ] Sem token em `localStorage` quando o provedor oferecer alternativa (documentar a escolha)

**Acceptance**: e2e login→rota protegida; token expirado renova ou força login com destino de volta; logout limpa tudo

---

### Issue 4: Telas de Conta

**Labels**: `semana-2`, `auth`, `telas`
**Size**: L (4-6 hours)

**Files**: `src/features/conta/`

**Tasks**:

- [ ] Login, criar conta (com código de convite se suportado), esqueci/redefinir senha, confirmar e-mail — redirecionando ao provedor hosted quando for o caso, ou telas próprias conforme a decisão do backend
- [ ] Copy pt-BR espelhando as telas antigas; validações de formulário com mensagens de domínio
- [ ] Rate-limit/lockout do provedor tem UI própria (não genérica)
- [ ] e2e: criar conta→confirmar→login; código de convite inválido → mensagem amigável

**Acceptance**: fluxo de conta completo em staging; 404 para rota de cadastro quando fechado (paridade com monólito)

---

### Issue 5: Páginas de Erro Definitivas

**Labels**: `semana-2`, `design`, `telas`
**Size**: S (1-2 hours)

**Files**: `src/features/erros/`

**Tasks**:

- [ ] `NaoAchei` (404), `DeuErrado` (500), método errado (405) com ilustração SVG própria em 2 cores — paridade visual com `nao_achei.html`/`deu_errado.html`
- [ ] Links de retorno contextuais por prefixo (ex.: erro em `/aposta/` → voltar para Apostas)
- [ ] Error Boundary da Semana 1 passa a usar `DeuErrado`
- [ ] Teste: nenhuma página de erro mostra stack/JSON

**Acceptance**: forçar erro em cada prefixo mostra página correta com ação de retorno

---

### Issue 6: Configuração de Ambientes e Deploy de Staging

**Labels**: `semana-2`, `infra`
**Size**: M (2-3 hours)

**Tasks**:

- [ ] Deploy automático de `main` → staging na plataforma escolhida (ADR 008)
- [ ] Config runtime (`public/config.json`) ou variáveis por ambiente sem rebuild (decisão da Issue 2 da Semana 1)
- [ ] Headers de segurança (CSP estrita, XCTO, Referrer-Options), SPA fallback, cache imutável de assets hasheados, `index.html` sem cache
- [ ] `docs/runbooks/deploy.md` com o procedimento realizado

**Acceptance**: main mergeada aparece em staging < 10min; CSP sem violação no console; hard refresh nunca serve `index.html` velho

---

### Issue 7: Hook de Job 202 (`useJob`)

**Labels**: `semana-2`, `api`
**Size**: M (2-3 hours)

**Files**: `src/api/useJob.ts`

**Tasks**:

- [ ] Polling de `GET /api/v1/upload/{job_id}` a 1000ms com backoff exponencial após 10s estável; cancel on unmount/rota-troca
- [ ] Estados de primeira classe: `processando`, `aguardando_autorizacao` (cartão do pode — UI detalhada na Semana 4), `concluido`, `erro`
- [ ] Unit tests com timers falsos: múltiplos mounts não criam intervalos duplicados
- [ ] MSW handlers do job nos 3 estados

**Acceptance**: polling demonstrável em tela de teste/Storybook interno; unmount cancela requests (assert no teste)
