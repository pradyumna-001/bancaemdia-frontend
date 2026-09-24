# Semana 5: Conta e Endurecimento — Milestones & GitHub Issues

## Milestone: **Semana 5 — Banca, Casas, Configurações, Coleta, e2e Completo, Deploy Prod**

**Target Date**: 7 days from Week 4
**Success Criteria**:
- [ ] Banca (caixa por casa), Casas ("onde tenho conta"), Configurações e Hub de Coleta com paridade do monólito
- [ ] Tutorial/extensão (onboarding) e Exportar Excel operando
- [ ] Os 8 fluxos e2e do ADR 007 verdes; auditoria perf + a11y dentro dos budgets do ADR 001
- [ ] Deploy em produção com runbook de rollback testado (< 7 min)
- [ ] Paridade total do inventário do ADR 013 verificada e assinada

---

## GitHub Issues (9 issues)

### Issue 1: Tela Banca (caixa por casa)
**Labels**: `semana-5`, `telas`, `banca`
**Size**: L (6-8 hours)

**Files**: `src/features/banca/`

**Tasks** (consome `caixa` endpoints; lacunas de apelido/capital inicial transferência devem estar resolvidas):
- [ ] Saldos por casa (`GET /caixa/saldo`) com apelidos; lançar depósito/saque (`POST /caixa`) valor em centavos via formatador único
- [ ] Extrato por casa (`GET /caixa/extrato`) e lista de movimentos com filtros
- [ ] Transferência entre casas conforme contrato; vincular conta à banca (`PATCH /caixa/contas/{id}/banca`) com modo conjunta/separada por grupo explicado em copy
- [ ] Todo número vem da API (regra 1 AGENTS); formulário nunca calcula saldo previsto
- [ ] e2e: depositar→saldo atualiza (read-your-writes, ADR 004); transferir→extrato reflete as duas pontas

**Acceptance**: paridade com `/banca` lado a lado; nenhum cálculo de saldo no cliente (CI grep em `features/banca`)

---

### Issue 2: Tela Casas ("onde eu tenho conta")
**Labels**: `semana-5`, `telas`
**Size**: M (3-4 hours)

**Tasks** (depende de ❌ endpoint contas_casa com vigência):
- [ ] Lista de casas canônicas; marcar "nunca tive" / "tive até <data>" por casa
- [ ] Ao mudar, recado numérico explícito: "N apostas saem da apuração" (número vem da API, regra 1)
- [ ] Confirmar mudanças destrutivas de apuração

**Acceptance**: marcar casa atualiza as listagens (filtro conta-casa reflete); recado mostra número exato da API

---

### Issue 3: Tela Configurações (padrão-ouro)
**Labels**: `semana-5`, `telas`
**Size**: L (4-6 hours)

**Tasks** (depende de ❌ endpoints de preferências; tema é local):
- [ ] Valor da unidade temporal (vigente_de) com histórico; formato de odd; e-mail da conta; tema (localStorage + token)
- [ ] "Apagar tudo" com confirmação pesada (digitar frase / dupla confirmação) — paridade do monólito
- [ ] Tela usada como referência de qualidade para revisar as demais (era a "tela padrão-ouro" do dono)
- [ ] Decisão de contagem de casas exibida aqui se o monólito a tinha

**Acceptance**: alterar unidade cria vigência nova (não reescreve histórico); apagar tudo exige confirmação pesada e zera a conta (verificado em e2e com usuário descartável)

---

### Issue 4: Hub de Coleta (extensão)
**Labels**: `semana-5`, `telas`, `coleta`
**Size**: M (3-4 hours)

**Tasks** (depende de ❌ endpoints de token de coleta):
- [ ] Status de conexão da extensão em primeiro lugar (como no monólito)
- [ ] Criar/rotacionar token com fluxo de cópia única (token mostrado uma vez); histórico/data do último uso quando disponível
- [ ] Passos de instalação com ilustrações SVG próprias; link para Tutorial

**Acceptance**: rotacionar token invalida o anterior (verificável via API); página desconectada mostra status de erro claro antes de qualquer ação

---

### Issue 5: Tutorial, Extensão e Exportar
**Labels**: `semana-5`, `telas`
**Size**: M (2-3 hours)

**Tasks**:
- [ ] `/tutorial`: como exportar do Telegram Desktop — ilustrações SVG próprias, nenhum print fabricado (política)
- [ ] `/extensao`: instalação da extensão + download do ZIP (asset conforme decisão em API-CONTRACTS)
- [ ] Exportar Excel: `GET /api/v1/painel/export` como download autenticado de blob com nome de arquivo data-stamped
- [ ] Páginas abertas (sem login) se o produto assim definir — decidir e registrar

**Acceptance**: download do xlsx abre no Excel com dados do período filtrado atual; tutorial legível em mobile

---

### Issue 6: Suíte e2e Completa
**Labels**: `semana-5`, `testes`
**Size**: M (3-4 hours)

**Tasks**:
- [ ] Os 8 fluxos do ADR 007 verdes nos dois viewports (390×844, 1440×900)
- [ ] Checklist §1-bis automatizado: zero `<select>`, zero `input[type=date]` (e2e grep no DOM), zero estado morto (cada rota autenticada tem skeleton/erro/vazio), zero flash de tema
- [ ] Axe-core em todas as telas principais (a11y AA)

**Acceptance**: pipeline inteiro ≤ 15 min; sem flakes em 5 rodadas; relatório axe sem violação crítica

---

### Issue 7: Auditoria de Performance e A11y
**Labels**: `semana-5`, `perf`, `a11y`
**Size**: M (2-3 hours)

**Tasks**:
- [ ] Lighthouse CI com budgets ADR 001 virando bloqueio (deixa de ser informativo): LCP<2.5s, INP<200ms, CLS<0.1, scores ≥95
- [ ] Bundle audit: JS inicial ≤ 200 KB gzip; code splitting por rota
- [ ] CLS visual em Apostas/Painel com rede lenta (throttle CI)
- [ ] Foco, teclado, contraste 4.5:1 varrido

**Acceptance**: budgets bloqueantes no CI e passando; relatório anexado ao PR da issue

---

### Issue 8: Deploy Produção e Runbooks
**Labels**: `semana-5`, `infra`
**Size**: M (3-4 hours)

**Tasks**:
- [ ] CD para produção (plataforma do ADR 008): tag `v1.0.0-frontend`, artefato imutável, rollback reapontando artefato anterior
- [ ] `docs/runbooks/deploy.md` e `docs/runbooks/rollback.md` finais, executados de verdade (rollback testado em staging < 7 min)
- [ ] CSP final em produção; verificação de headers no runbook
- [ ] Runbook de incidente (`docs/runbooks/incident.md`) com links de rollout

**Acceptance**: rollback ensaiado e cronometrado < 7 min em staging; produção servindo com budgets verdes

---

### Issue 9: Auditoria de Paridade Final
**Labels**: `semana-5`, `qa`
**Size**: M (3-4 hours)

**Tasks**:
- [ ] Percorrer linha a linha o inventário do ADR 013 contra a UI nova com o mesmo usuário de teste no monólito e em v2; registrar diffs intencionais como ADR ou nota aprovada
- [ ] Vocabulário final varrido contra `termos.ts`
- [ ] Todas as lacunas de API-CONTRACTS ou resolvidas no backend ou com issue aberta linkada
- [ ] Assinatura do dono: paridade aprovada

**Acceptance**: tabela ADR 013 toda ✅ ou desvio registrado; release `v1.0.0` publicada
