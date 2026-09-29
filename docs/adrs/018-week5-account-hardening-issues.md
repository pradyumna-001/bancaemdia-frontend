# Semana 5: Conta e Endurecimento — Milestones & GitHub Issues

> Revisão visual de 29/09/2026: aplicar os [critérios comuns do backlog](../research/backlog-visual.md) e o [ADR 006](006-visual-system.md). Paridade com o monólito significa tarefas e dados; a aparência segue a pesquisa aprovada.

## Milestone: **Semana 5 — Caixa, Casas, Configurações, Coleta, e2e Completo, Deploy Prod**

**Target Date**: 7 days from Week 4
**Success Criteria**:

- [ ] Caixa (saldos por casa), Casas ("onde tenho conta"), Configurações e Hub de Coleta com paridade do monólito
- [ ] Tutorial/extensão (onboarding) e Exportar Excel operando
- [ ] Os 8 fluxos e2e do ADR 007 verdes; auditoria perf + a11y dentro dos budgets do ADR 001
- [ ] Deploy em produção com runbook de rollback testado (< 7 min)
- [ ] Paridade total do inventário do ADR 013 verificada e assinada

---

## GitHub Issues (9 issues)

### Issue 1: Tela Caixa (saldos e movimentos por casa)

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

#### Direção de uso e visual — GitHub #31

Título e navegação usam Caixa, mantendo /banca e o domínio de banca/grupo. Priorizar saldos confirmados por casa, extrato e ações Depósito/Saque/Transferência. Formulário identifica origem/destino/valor; não calcula saldo futuro nem usa saldo otimista.

**Aceite complementar:** Mesmos saldos/extrato da API, valores alinhados e identificados por casa; erro preserva entrada, confirmação mostra consequência e transferência só aparece concluída após resposta/refetch.

---

### Issue 2: Tela Casas ("onde eu tenho conta")

**Labels**: `semana-5`, `telas`
**Size**: M (3-4 hours)

**Tasks** (depende de ❌ endpoint contas_casa com vigência):

- [ ] Lista de casas canônicas; marcar "nunca tive" / "tive até <data>" por casa
- [ ] Ao mudar, recado numérico explícito: "N apostas saem da apuração" (número vem da API, regra 1)
- [ ] Confirmar mudanças destrutivas de apuração

**Acceptance**: marcar casa atualiza as listagens (filtro conta-casa reflete); recado mostra número exato da API

#### Direção de uso e visual — GitHub #32

Cada casa mostra vínculo e vigência em linguagem clara. Mudança que altera apuração apresenta impacto numérico vindo da API antes da confirmação, com possibilidade de cancelar; não esconder exclusões em filtros implícitos.

**Aceite complementar:** Estado atual e data legíveis nos dois temas; efeito N apostas informado sem depender de cor e confirmação acessível mantém consistência com a lista após salvar.

---

### Issue 3: Tela Configurações (conta e preferências)

**Labels**: `semana-5`, `telas`
**Size**: L (4-6 hours)

**Tasks** (depende de ❌ endpoints de preferências; tema é local):

- [ ] Valor da unidade temporal (vigente_de) com histórico; formato de odd; e-mail da conta; aparência Sistema/Claro/Escuro (preferência local, nunca token de sessão)
- [ ] "Apagar tudo" com confirmação pesada (digitar frase / dupla confirmação) — paridade do monólito
- [ ] Qualidade avaliada pela direção visual do ADR 006 e por tarefas verificáveis; não usar a aparência antiga como gabarito
- [ ] Decisão de contagem de casas exibida aqui se o monólito a tinha

**Acceptance**: alterar unidade cria vigência nova (não reescreve histórico); apagar tudo exige confirmação pesada e zera a conta (verificado em e2e com usuário descartável)

#### Direção de uso e visual — GitHub #33

Agrupar Conta, Preferências, Unidade/histórico e área de exclusão. Reutilizar o controle Sistema/Claro/Escuro; feedback de salvamento perto da seção. Apagar tudo fica separado, com confirmação proporcional e explicação do alcance; a tela antiga não é gabarito estético.

**Aceite complementar:** Histórico de vigência legível, estados salvar/erro/sucesso por seção e confirmação destrutiva por teclado/celular; tema tolera storage bloqueado e não guarda token de sessão.

---

### Issue 4: Hub de Coleta (extensão)

**Labels**: `semana-5`, `telas`, `coleta`
**Size**: M (3-4 hours)

**Tasks** (depende de ❌ endpoints de token de coleta):

- [ ] Status de conexão da extensão em primeiro lugar (como no monólito)
- [ ] Criar/rotacionar token com fluxo de cópia única (token mostrado uma vez); histórico/data do último uso quando disponível
- [ ] Passos de instalação com ilustrações SVG próprias; link para Tutorial

**Acceptance**: rotacionar token invalida o anterior (verificável via API); página desconectada mostra status de erro claro antes de qualquer ação

#### Direção de uso e visual — GitHub #34

Começar pelo status de conexão e próxima ação útil. Instalação em passos curtos; token mostrado uma vez com ação Copiar e confirmação de cópia. Rotação explica invalidação antes de executar; nunca pôr segredo em URL, log ou captura de teste.

**Aceite complementar:** Desconectado/pendente/conectado/erro têm texto e ação adequados; copiar/rotacionar operáveis por teclado/toque, com segredo oculto após sair do fluxo.

---

### Issue 5: Tutorial, Extensão e Exportar

**Labels**: `semana-5`, `telas`
**Size**: M (2-3 hours)

**Tasks**:

- [ ] `/tutorial`: como exportar do Telegram Desktop — ilustrações SVG próprias, nenhum print fabricado (política)
- [ ] `/extensao`: instalação da extensão + download do ZIP (asset conforme decisão em API-CONTRACTS)
- [ ] Exportar Excel: `GET /api/v1/painel/export` como download autenticado de blob com nome de arquivo data-stamped
- [ ] Preservar Tutorial/Extensão públicos conforme a #3; qualquer mudança de acesso exige decisão registrada

**Acceptance**: download do xlsx abre no Excel com dados do período filtrado atual; tutorial legível em mobile

#### Direção de uso e visual — GitHub #35

Tutorial dividido em passos orientados à tarefa, com títulos concretos, requisitos e resultado esperado; ilustrações próprias só onde esclarecem. Downloads mostram formato e progresso/erro; exportação indica período e filtros usados.

**Aceite complementar:** Tutorial útil em 320px e com teclado; download falho oferece retry e sucesso entrega o arquivo correto. Preservar acesso público de tutorial/extensão já definido na #3, salvo decisão de produto registrada.

---

### Issue 6: Suíte e2e Completa

**Labels**: `semana-5`, `testes`
**Size**: M (3-4 hours)

**Tasks**:

- [ ] Os 8 fluxos do ADR 007 verdes nos dois viewports (390×844, 1440×900)
- [ ] Checklist §1-bis automatizado: zero `<select>`, zero `input[type=date]` (e2e grep no DOM), zero estado morto (cada tela cobre os estados aplicáveis de carga/erro/vazio, sem skeleton obrigatório em formulário estático), zero flash de tema
- [ ] Axe-core em todas as telas principais (a11y AA)

**Acceptance**: pipeline inteiro ≤ 15 min; sem flakes em 5 rodadas; relatório axe sem violações nos cenários cobertos e verificação manual complementar

#### Direção de uso e visual — GitHub #36

Tratar estados aplicáveis por tipo de tela: lista vazia, carregamento de dados, erro, sucesso e atualização; não exigir skeleton em formulário estático. Cobrir claro/escuro/sistema, teclado, foco, reflow, cor acompanhada de texto e recuperação.

**Aceite complementar:** Zero violações axe nos cenários cobertos, com verificação manual complementar; todas as tarefas críticas nos dois viewports e três navegadores. Relatório não confunde automação com certificação integral de acessibilidade.

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

#### Direção de uso e visual — GitHub #37

Auditar tarefas reais com dados densos e rede lenta, além de scores: foco não encoberto, contraste nos dois temas, reflow a 320px, zoom, alvos de toque e movimento reduzido quando houver animação. Avaliar leitura de números e hierarquia.

**Aceite complementar:** Budgets e evidências de teclado/contraste/estabilidade anexados; distinguir latência de interação medida em laboratório de INP de campo, sem afirmar que Lighthouse sozinho mede toda a experiência.

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

#### Direção de uso e visual — GitHub #38

Release preserva fontes, tokens, tema antes da pintura, marca e recuperação de erros sob CSP real. Rollback restaura HTML/assets/configuração compatíveis, inclusive hash do script de tema.

**Aceite complementar:** Smoke em produção/rollback com deep link e dois temas; nenhum banner de teste, dado fictício ou fixture de sessão publicado.

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

#### Direção de uso e visual — GitHub #39

Auditoria de paridade é funcional e de dados; diferenças visuais seguem ADR 006 e esta pesquisa. Registrar pendências reais e testar tarefas com participantes representativos quando disponíveis: localizar/filtrar aposta, marcar resultado, corrigir bilhete, enviar e consultar Caixa. Medir conclusão, erros, tempo e compreensão; preferência visual é coletada separadamente.

**Aceite complementar:** Inventário funcional completo ou desvios registrados, direção visual consistente e evidências de acessibilidade. Relatório distingue testes automáticos, revisão especializada e pesquisa com participantes; ausência de participantes vira limitação explícita, nunca aprovação inventada.
