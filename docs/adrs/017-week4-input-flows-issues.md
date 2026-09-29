# Semana 4: Fluxos de Entrada — Milestones & GitHub Issues

> Revisão visual de 29/09/2026: aplicar os [critérios comuns do backlog](../research/backlog-visual.md) e o [ADR 006](006-visual-system.md). Paridade com o monólito significa tarefas e dados; a aparência segue a pesquisa aprovada.

## Milestone: **Semana 4 — Enviar, Prints, Importar, Resultados, Revisão, Nova Aposta**

**Target Date**: 7 days from Week 3
**Success Criteria**:

- [ ] Upload de exportação Telegram com progresso real (job 202) e cartão de autorização de gasto funcional, incluindo caminho completo "Agora não"
- [ ] Resultados mobile-first: 20 resultados em 20 toques, sem reload, com desfazer da sessão
- [ ] Revisão: fila de bilhetes com foto+caption e correção por bilhete; contador do menu em tempo real
- [ ] Importar planilha com prévia de mapeamento antes de confirmar
- [ ] Nova aposta manual com freebet

---

## GitHub Issues (7 issues)

### Issue 1: Tela Enviar (Upload Telegram)

**Labels**: `semana-4`, `telas`, `entrada`
**Size**: L (6-8 hours)

**Files**: `src/features/enviar/`

**Tasks**:

- [ ] Upload de pasta/.zip (input `webkitdirectory` + drag-drop) → `POST /api/v1/upload` (multipart)
- [ ] Progresso via `useJob` (ADR 003): barra de andamento (port de `andamento.html`), estados textuais da etapa
- [ ] **Cartão do pode**: quando job = `aguardando_autorizacao`, cartão de autorização de gasto de IA com valor e proveniência de preço; botões "Autorizar" e "Agora não" — "Agora não" é caminho completo (job retoma sem IA ou encerra limpo, conforme contrato)
- [ ] Links para Tutorial, Prints e Importar; estado vazio com instrução
- [ ] Erros 400/413/422 com copy de domínio (formato errado, grande demais)

**Acceptance**: e2e do fluxo ADR 007 (#4): upload → progresso 1s → cartão do pode → autorizar → conclusão; caminho "Agora não" termina em estado limpo e navegável

#### Direção de uso e visual — GitHub #24

Organizar seleção → conferência → processamento → conclusão. Escolher arquivo é alternativa visível a arrastar, com formatos/limites antes do envio. Etapas reais e feedback persistente; cartão de autorização mostra valor/proveniência e dá clareza equivalente a Autorizar e Agora não.

**Aceite complementar:** Os dois caminhos de autorização chegam a resultado navegável; erro preserva contexto, não inventa percentual e não reenvia arquivo sem intenção. Fluxo operável no celular sem depender de pasta/drag-and-drop.

---

### Issue 2: Tela Prints (drag-and-drop)

**Labels**: `semana-4`, `telas`, `entrada`
**Size**: M (3-4 hours)

**Tasks** (depende de ❌ endpoint de prints em API-CONTRACTS):

- [ ] Drag-and-drop múltiplo com preview; dedupe por hash de conteúdo calculado no cliente antes de enviar (aviso "este print já foi")
- [ ] Upload em lote com progresso por arquivo; mesmo cartão de orçamento da Issue 1
- [ ] Falha parcial: os que subiram ficam; só os falhos têm retry

**Acceptance**: arrastar o mesmo print 2× mostra aviso de duplicado sem segundo upload; retry de falho não reenvia os válidos

#### Direção de uso e visual — GitHub #25

Oferecer seleção de arquivos além de arrastar. Miniaturas com espaço reservado, nome e estado por arquivo; duplicidade é aviso contextual. Resumo do lote separa sucesso e falha, com retry só dos falhos.

**Aceite complementar:** Mesmo fluxo por teclado/toque, mídia sem reflow, progresso e erro não dependem de cor; seleção múltipla e retry parcial não repetem uploads válidos.

---

### Issue 3: Tela Importar (planilha com prévia)

**Labels**: `semana-4`, `telas`, `entrada`
**Size**: L (4-6 hours)

**Tasks**:

- [ ] Upload de planilha (Excel/Bet-Analytix) → prévia retornada pela API
- [ ] **Mapeamento de colunas com pickers próprios acessíveis** (sem `<select>`; expansão por `<details>` quando apropriada) antes de confirmar — port do fluxo `/previa`→`/confirmar`
- [ ] Confirmar → `POST /api/v1/apostas/importar-planilha`; resultado com contagens (importadas, ignoradas, erros) em copy clara
- [ ] e2e: mapear colunas trocadas → confirmar → contagens corretas

**Acceptance**: nenhum commit da importação acontece sem passar pela prévia; remapear coluna errada persiste na prévia corretamente

#### Direção de uso e visual — GitHub #26

Prévia com amostras reais da API, origem da coluna e destino lado a lado, campos obrigatórios identificados e validação antes de confirmar. Etapas e voltar preservam mapeamento. Tabela larga tem rolagem contida e nome acessível, sem arrastar a página inteira.

**Aceite complementar:** Usuário identifica e corrige coluna errada em ambos os viewports; confirmação explica o que será importado e resultado distingue importadas/ignoradas/erros com próximos passos.

---

### Issue 4: Tela Resultados (um toque)

**Labels**: `semana-4`, `telas`, `resultados`
**Size**: L (6-8 hours)

**Files**: `src/features/resultados/`

**Tasks**:

- [ ] Fila de apostas pendentes, mais antiga primeiro; um cartão por vez (port de `cartao_resultado.html`)
- [ ] Botões GREEN/RED grandes; "Outro…" revela ANULADA/CASHOUT/MEIO_GREEN/MEIO_RED
- [ ] `POST /api/v1/apostas/{chave}/resultado` otimista com rollback em erro; **um toque = um resultado**, sem reload (regra §1-bis — medido no e2e)
- [ ] Fila de desfazer da sessão em `sessionStorage` (ADR 004): "desfazer" reverte via API enquanto houver itens; sobrevive F5, morre no fechar da aba
- [ ] Fim da fila: estado de conclusão com resumo da sessão
- [ ] Mobile-first: alvos de toque ≥ 48px, polegar-friendly

**Acceptance**: e2e marca 20 resultados em exatamente 20 toques medidos; desfazer 3 últimos reverte 3 chamadas na API; INP < 200ms por toque

#### Direção de uso e visual — GitHub #27

Manter bilhete/contexto legível e botões GREEN/RED estáveis com texto, alvos de 48px e resposta imediata. Outro revela demais estados; desfazer é visível e persistente durante a sessão. Não inserir modal de confirmação no caminho de resultado simples.

**Aceite complementar:** 20 resultados simples exigem 20 toques; toque duplo não resolve o próximo item acidentalmente. Erro desfaz a mudança otimista com explicação, foco progride de modo previsível e resumo usa dados confirmados, sem cálculo financeiro local.

---

### Issue 5: Tela Revisão (bilhetes)

**Labels**: `semana-4`, `telas`, `revisao`
**Size**: L (4-6 hours)

**Files**: `src/features/revisao/`

**Tasks**:

- [ ] Fila de `GET /api/v1/revisao`; cartão bilhete-inteiro: foto original sticky (desktop) + legenda legível do tipster em Source Sans 3 lado a lado com campos de correção por cupom (port de `cartao_revisao.html`)
- [ ] `POST /revisao/{id}/resolver`; resolver avança para o próximo bilhete sem voltar à lista se houver fila
- [ ] Badge do menu (Semana 1, Issue 6) atualiza ao resolver (invalidação da query `revisao/stats`)
- [ ] Contador some quando fila zera (aba Revisão some da nav)

**Acceptance**: e2e: resolver N bilhetes → badge N→0; correção de cupom persiste (verificado via `GET /revisao/{id}` quando aplicável)

#### Direção de uso e visual — GitHub #28

Fonte original e campos corrigíveis lado a lado no desktop; no celular, alternância/empilhamento explícito sem esconder a fonte. Destacar o que precisa de revisão com texto, preservar correções em erro e manter Resolver como ação clara.

**Aceite complementar:** Resolver avança e atualiza badge sem salto inesperado de foco; fila vazia apresenta conclusão/retorno mesmo quando a aba some. Conferência de foto/legenda e erro por campo funcionam por teclado e toque.

---

### Issue 6: Nova Aposta Manual

**Labels**: `semana-4`, `telas`, `apostas`
**Size**: M (2-3 hours)

**Tasks**:

- [ ] Formulário `POST /api/v1/apostas` com campos mínimos do contrato; checkbox freebet (stake travado em zero, hint explicativo — regra documentada do monólito)
- [ ] Validação client-side espelha 422 do backend (mensagens de domínio, sem JSON)
- [ ] Sucesso → navega à aposta criada; estado de origem `manual`

**Acceptance**: criar com freebet grava stake zero e face value no campo certo; inválido mostra erro de domínio no campo

#### Direção de uso e visual — GitHub #29

Formulário mostra campos mínimos primeiro, com labels persistentes, ajuda contextual e exemplos de formato. Freebet explica stake zero e valor de face sem cálculo local; opções avançadas sob demanda.

**Aceite complementar:** Inválido preserva valores e aponta campo; envio pendente impede duplicidade; criar leva ao detalhe confirmado e cancelar retorna ao contexto anterior.

---

### Issue 7: e2e dos Fluxos de Entrada + CI

**Labels**: `semana-4`, `testes`
**Size**: M (3-4 hours)

**Tasks**:

- [ ] Completar fluxos e2e ADR 007 (#4 enviar; #5 revisão; #3 resultados)
- [ ] Playwright: upload de arquivo de teste; MSW/Replay para polling do job em todos os estados
- [ ] Shard e2e em 4 workers no CI; artifacts (traces/vídeo) em falha

**Acceptance**: pipeline e2e dos fluxos de entrada verde; falha gera trace baixável

#### Direção de uso e visual — GitHub #30

Cobrir autorização/recusa, falha parcial, remapeamento, revisão e desfazer em temas/viewports previstos. Capturas e traces devem revelar etapa, feedback e foco quando um fluxo falha.

**Aceite complementar:** Além das chamadas corretas, assertar mensagens, transições e recuperação; sem testes ignorados ou redução de gates para entregar verde.
