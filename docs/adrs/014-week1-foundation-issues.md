# Semana 1: Fundação — Milestones & GitHub Issues

## Milestone: **Semana 1 — Fundação (Vite + TS strict + Tooling + Sistema Visual + Shell)**

**Target Date**: 7 days from start
**Success Criteria**:
- [ ] Repositório scaffolded com toda a tooling; `make install && make lint && make typecheck && make test && make build` verde
- [ ] CI GitHub Actions: `lint → typecheck → unit → build` verde em qualquer push
- [ ] Design tokens portados da paleta C1 com lint de "cor só em tokens" ativo
- [ ] Shell com navegação das 7 abas a partir de fonte única `ABAS`, desktop (topo) + mobile (barra inferior)
- [ ] Página interna `/sistema` mostrando tokens, tipografia, ícones (`/sistema` da paridade)
- [ ] Estrutura de pastas `src/{app,api,auth,components,features,lib,styles}` definida

---

## GitHub Issues (8 issues)

### Issue 1: Repository Scaffold & Tooling
**Labels**: `semana-1`, `infra`, `setup`
**Size**: M (2-3 hours)

**Tasks**:
- [ ] Vite 6 + React 18 + TypeScript strict (`strict`, `noUncheckedIndexedAccess`), `pnpm`
- [ ] `package.json` scripts: `dev`, `build`, `preview`, `lint`, `format`, `typecheck`, `test`, `test:e2e`, `gen-types`
- [ ] Dependências runtime: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `openapi-fetch`
- [ ] Dependências dev: `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `msw`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `prettier`, `openapi-typescript`, `husky` (ou lefthook), `lint-staged`
- [ ] `Makefile`: `install`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `build`, `gen-types`, `up` (docker compose com a API) — espelho do Makefile do backend
- [ ] `.pre-commit-config.yaml` (já presente), `.gitignore`, `.env.example`, `LICENSE`
- [ ] `Dockerfile` multi-stage (build node → nginx non-root) + `docker-compose.yml` opcional servindo SPA estático

**Acceptance**: `make install && make lint && make typecheck && make test && make build` passa na máquina limpa; `docker build` produz imagem

---

### Issue 2: Configuração por Ambiente
**Labels**: `semana-1`, `config`
**Size**: S (1-2 hours)

**File**: `src/lib/config.ts`

**Tasks**:
- [ ] Parse validado de `import.meta.env` (zod ou validador à mão): `VITE_API_URL` (URL obrigatória), `VITE_APP_ENV` (`development|staging|production`), `VITE_UPLOAD_POLL_MS` (int positivo, default 1000)
- [ ] Falha rápida no boot com mensagem clara quando obrigatória ausente
- [ ] Estratégia config runtime `public/config.json` para staging/prod sem rebuild (ADR 008) — decidir e documentar
- [ ] `.env.example` completo e coerente com `.env.example` do backend

**Acceptance**: app sobe com apenas `VITE_API_URL` definida; var inválida aborta com erro legível

---

### Issue 3: Estrutura de App, Roteador e Error Boundaries
**Labels**: `semana-1`, `app`
**Size**: M (2-3 hours)

**Files**: `src/app/`, `src/main.tsx`

**Tasks**:
- [ ] React Router data router com rotas placeholder das 7 abas + `/aposta/:chave`, `/configuracoes`, `/tutorial`, `/extensao`, `/sistema`, rotas de auth placeholder
- [ ] `QueryClientProvider` com defaults do ADR 004 (staleTime por tipo, retry por status do ADR 005)
- [ ] Error Boundary por rota → página "deu errado" + 404 "não achei" (versões iniciais; estilização final na Semana 2)
- [ ] Guard de rota autenticada placeholder (redirect para `/login` com `destino` interno validado — guard open-redirect, AGENTS regra 23)

**Acceptance**: navegar para cada rota renderiza placeholder; rota inexistente → 404 estilizada; rota protegida sem sessão → `/login?destino=...`

---

### Issue 4: Design Tokens e Paleta (port da C1)
**Labels**: `semana-1`, `design`
**Size**: M (3-4 hours)

**Files**: `src/styles/tokens.css`, `src/styles/base.css`, `eslint` rule

**Tasks**:
- [ ] Portar tokens de `paleta.css` (monólito) para CSS custom properties semânticas: tinta/fundo/superfícies, `--lucro` (#0e7a55/#3ad698 por tema), `--perda` (#c5372c/#ff6f61), foco, bordas — temas `data-tema="escuro"` (padrão) e `"claro"`
- [ ] Escala de espaçamento 4/8/16/24/32 e raio 14 como tokens
- [ ] Script pre-paint inline em `index.html` (sem flash); toggle persiste em `localStorage` (porta de `tema.js`)
- [ ] Regra ESLint custom + script CI: literal de cor (`#`, `rgb(`, `hsl(`) proibido fora de `tokens.css` (porta do teste de paleta única)
- [ ] Fontes woff2 vendidas em `public/fontes/` com licenças OFL; `@font-face` com `font-display: swap`

**Acceptance**: CI falha ao adicionar `#abc` num componente; temas escuro/claro alternam sem flash; Lighthouse não flaga fonte

---

### Issue 5: Marca e Identidade Mínima
**Labels**: `semana-1`, `design`, `marca`
**Size**: S (1-2 hours)

**Tasks**:
- [ ] Decidir com o dono: wordmark final "bancaemdia" (manter padrão peso-cortado? sem símbolo?) — registrar decisão
- [ ] `favicon.svg` novo
- [ ] Wordmark componente `<Logo />` usado em header/login
- [ ] Atualizar tokens se nova marca alterar acento

**Acceptance**: nome/favicon/wordmark consistentes em header, login e página de erro; decisão registrada neste ADR ou em follow-up

---

### Issue 6: Shell de Navegação (fonte única ABAS)
**Labels**: `semana-1`, `app`, `design`
**Size**: M (2-3 hours)

**Files**: `src/app/nav.ts`, `src/app/Shell.tsx`, `src/components/Icone.tsx`

**Tasks**:
- [ ] `ABAS` fonte única: Apostas `/`, Painel `/painel`, Enviar `/enviar`, Coleta `/coleta`, Banca `/banca`, Resultados `/resultados`, Revisão `/revisao` (oculta sem fila; badge com contador)
- [ ] Desktop: barra superior; mobile: barra inferior ícone+label (regra de design herdada) a partir da mesma lista
- [ ] `Icone.tsx`: registro único de nomes de ícone; teste falha com ícone não registrado (porta do watcher de ícones)
- [ ] Banner de cópia de teste quando `VITE_APP_ENV != production`
- [ ] Query de contagem da fila de revisão (`/api/v1/revisao/stats`) alimentando badge — com mock por enquanto

**Acceptance**: snapshot test garante ABAS única; badge da Revisão só renderiza com contagem > 0; mobile/desktop ambos verificáveis

---

### Issue 7: Gráficos SVG Base
**Labels**: `semana-1`, `design`, `graficos`
**Size**: M (3-4 hours)

**Files**: `src/components/graficos/`

**Tasks**:
- [ ] `GraficoEvolucao`: linha de lucro acumulado, x proporcional ao dia de calendário (lacunas aparecem), eixo zero sempre desenhado, preenchimento de área — port de `_grafico_da_evolucao`
- [ ] `BarrasLucro`: barras horizontais, comprimento ∝ |lucro|, **espessura = √n**, origem no zero e direção pelo sinal; tooltip acessível
- [ ] Testes unit de geometria (escala, zero-clamp, √n) — sem snapshot de pixels
- [ ] Demonstração dos dois na página `/sistema`

**Acceptance**: geometria coberta por unit tests; `/sistema` renderiza ambos com dados fake; nenhuma dependência de chart lib no `package.json` (CI grep)

---

### Issue 8: CI Inicial + Budgets
**Labels**: `semana-1`, `infra`, `ci`
**Size**: M (2-3 hours)

**Files**: `.github/workflows/ci.yml`

**Tasks**:
- [ ] Workflow: `lint (inclui paleta/ícone) → typecheck → vitest (coverage ≥80% em lib/features quando existirem) → build → lighthouse-ci` com budgets do ADR 001 temporariamente só-informativo até Semana 5
- [ ] Bundle budget: falha se JS inicial > 200 KB gzip (`vite-bundle-visualizer` ou `size-limit`)
- [ ] Escolher e registrar plataforma de deploy (AWS S3+CloudFront vs Vercel/CF Pages) — resultado atualiza ADR 008
- [ ] Branch protection: workflow verde obrigatório para merge em `main`

**Acceptance**: PR de teste passa por todos os gates; marcação de plataforma de deploy registrada no ADR 008
