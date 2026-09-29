# Semana 2: Auth e Cliente da API — Milestones & GitHub Issues

> Revisão visual de 29/09/2026: aplicar os [critérios comuns do backlog](../research/backlog-visual.md) e o [ADR 006](006-visual-system.md). Paridade com o monólito significa tarefas e dados; a aparência segue a pesquisa aprovada.

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

#### Direção de uso e visual — GitHub #9

Cliente e mocks devem permitir distinguir carregamento inicial, atualização, lista vazia, erro e dado indisponível. Preservar os dados válidos durante atualização e expor erro tipado seguro; não fabricar zeros de negócio.

**Aceite complementar:** Contratos tipados alimentam cenários de interface; loading/error/null não são confundidos com saldo zero ou lista vazia válida.

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

#### Direção de uso e visual — GitHub #10

Erro aparece perto da tarefa afetada, com causa compreensível e recuperação. Falha de atualização preserva conteúdo anterior com aviso; evitar apagar a tela inteira ou empilhar toasts. Rate limit bloqueia apenas ações afetadas; navegação e leitura continuam disponíveis.

**Aceite complementar:** Simular 429/503/offline, conflito e recuperação com foco e anúncio acessíveis, sem repetição infinita, perda silenciosa de formulário ou falso sucesso.

---

### Issue 3: Camada de Autenticação (`ProvedorAuth`)

**Labels**: `semana-2`, `auth`
**Size**: L (4-6 hours)

**Files**: `src/auth/`

**Tasks**:

- [ ] **Pré-requisito**: backend define provedor de identidade (issue no repo da API — ver `docs/API-CONTRACTS.md`); se indefinido, testar a mesma interface com mock em fixture isolada, sem liberar sessão no build público
- [ ] Interface `ProvedorAuth` (ADR 003): `token()`, `login()`, `logout()`, estado de interação; implementação para o provedor escolhido
- [ ] Guard de rotas com `destino` validado contra allowlist de paths internos
- [ ] Injetor de `Authorization` no `client.ts`; renovação de token transparente; 401 global → logout limpo (sem loop)
- [ ] Sem token de sessão em `localStorage`, conforme AGENTS 23; documentar transporte no ADR 003

**Acceptance**: e2e login→rota protegida; token expirado renova ou força login com destino de volta; logout limpa tudo

#### Direção de uso e visual — GitHub #11

Sessão tem estados visíveis de verificação, autenticação e expiração; evitar flash de conteúdo protegido. Após login, recuperar destino interno e filtros. Provedor hospedado deve manter rótulos e contexto coerentes dentro das possibilidades do contrato.

**Aceite complementar:** Expiração apresenta próxima ação e não entra em loop; logout remove dados privados do cache. Mock de sessão nunca libera acesso no build público.

---

### Issue 4: Telas de Conta

**Labels**: `semana-2`, `auth`, `telas`
**Size**: L (4-6 hours)

**Files**: `src/features/conta/`

**Tasks**:

- [ ] Login, criar conta (com código de convite se suportado), esqueci/redefinir senha, confirmar e-mail — redirecionando ao provedor hosted quando for o caso, ou telas próprias conforme a decisão do backend
- [ ] Copy pt-BR clara, com vocabulário canônico e orientada à tarefa; validações de formulário com mensagens de domínio
- [ ] Rate-limit/lockout do provedor tem UI própria (não genérica)
- [ ] e2e: criar conta→confirmar→login; código de convite inválido → mensagem amigável

**Acceptance**: fluxo de conta completo em staging; 404 para rota de cadastro quando fechado (paridade com monólito)

#### Direção de uso e visual — GitHub #12

Formulários focados em uma tarefa, labels persistentes, autocomplete adequado, mostrar/ocultar senha e validação junto ao campo. Preservar campos seguros após erro, orientar confirmação de e-mail e separar ação principal dos links de ajuda. Evitar decoração ou promessa comercial competindo com login.

**Aceite complementar:** Completar os fluxos por teclado e celular; erros associados aos campos, foco no erro relevante, envio duplicado prevenido e estados de espera/sucesso compreensíveis.

---

### Issue 5: Páginas de Erro Definitivas

**Labels**: `semana-2`, `design`, `telas`
**Size**: S (1-2 hours)

**Files**: `src/features/erros/`

**Tasks**:

- [ ] `NaoAchei` (404), `DeuErrado` (500), método errado (405) com ilustração SVG própria em 2 cores — hierarquia de erro e recuperação do ADR 006, preservando a função das páginas antigas
- [ ] Links de retorno contextuais por prefixo (ex.: erro em `/aposta/` → voltar para Apostas)
- [ ] Error Boundary da Semana 1 passa a usar `DeuErrado`
- [ ] Teste: nenhuma página de erro mostra stack/JSON

**Acceptance**: forçar erro em cada prefixo mostra página correta com ação de retorno

#### Direção de uso e visual — GitHub #13

Hierarquia: o que aconteceu, o que fazer e retorno contextual. Ilustração SVG pequena só quando ajuda, com cores dos tokens; copiar o desenho antigo não é requisito. Preservar shell/contexto quando tecnicamente recuperável.

**Aceite complementar:** 404/405/500 legíveis nos dois temas, com título e ação acessíveis; não depender da ilustração para explicar a falha nem mostrar stack/JSON.

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

#### Direção de uso e visual — GitHub #14

Staging deve permitir revisar o produto real: fontes locais, temas, deep links e banner Cópia de teste da configuração validada. O artefato e a CSP preservam a aplicação de tema antes da pintura.

**Aceite complementar:** Smoke nos dois temas e viewports em staging; produção sem banner de teste; nenhuma fixture de sessão incluída no artefato publicado.

---

### Issue 7: Hook de Job 202 (`useJob`)

**Labels**: `semana-2`, `api`
**Size**: M (2-3 hours)

**Files**: `src/api/useJob.ts`

**Tasks**:

- [ ] Polling de `GET /api/v1/upload/{job_id}` a 1000ms com backoff exponencial após 10s estável; cancel on unmount/rota-troca
- [ ] Estados de primeira classe: `processando`, `aguardando_autorizacao` (cartão do pode — UI detalhada na Semana 4), `concluido`, `erro`
- [ ] Unit tests com timers falsos: múltiplos mounts não criam intervalos duplicados
- [ ] MSW handlers do job nos quatro estados descritos

**Acceptance**: polling demonstrável em tela de teste/Storybook interno; unmount cancela requests (assert no teste)

#### Direção de uso e visual — GitHub #15

Expor etapas reais do job e transições para feedback compreensível. Sem percentual inventado quando a API só informa etapa. Aguardando autorização pausa o polling conforme contrato e mantém a decisão visível.

**Aceite complementar:** Testar processando, aguardando autorização, concluído e erro; sem timers duplicados ou anúncio repetitivo ao leitor de tela. Cancelar observação da tela não deve afirmar que cancelou o processamento no servidor.
