# Semana 3: Telas Centrais — Milestones & GitHub Issues

## Milestone: **Semana 3 — Apostas, Aposta (detalhe), Painel**

**Target Date**: 7 days from Week 2
**Success Criteria**:

- [ ] Lista de Apostas com cabeçalho de números, mini-gráficos, filtros completos em pílulas URL — paridade com `/` do monólito
- [ ] Visão `?apagadas=1` persistente em toda navegação; apagar/restaurar funcionais
- [ ] Detalhe da aposta com foto, correção allowlist, resolução de dúvida de par
- [ ] Painel com pílulas de período, gráficos SVG da Semana 1 e dados reais de `/painel` + `/painel/metricas`
- [ ] Hipotética (`/e-se`) acessível mas fora da capa

---

## GitHub Issues (8 issues)

### Issue 1: Formatadores e Termos

**Labels**: `semana-3`, `lib`
**Size**: S (1-2 hours)

**Files**: `src/lib/format.ts`, `src/lib/termos.ts`

**Tasks**:

- [ ] Formatadores únicos: moeda (centavos→R$), odd (formato configurável, default da API), data/hora pt-BR, unidades
- [ ] `termos.ts`: tabela canônica de vocabulário (Painel, Caixa, estados PENDENTE/GREEN/RED/ANULADA/CASHOUT/MEIO_GREEN/MEIO_RED, etc.)
- [ ] Componentes `<Valor centavos={} sinal />` (cor via token lucro/perda) e `<EstadoAposta />`
- [ ] Unit tests incluindo edge: zero, negativo, MEIO_*

**Acceptance**: nenhum `toLocaleString` solto em feature (CI grep); divisão/multiplicação por 100 só dentro de `format.ts`

---

### Issue 2: Filtros, Pílulas e Params de URL

**Labels**: `semana-3`, `lib`, `app`
**Size**: M (3-4 hours)

**Files**: `src/lib/params.ts`, `src/components/Filtros/`

**Tasks**:

- [ ] Schema de params (ADR 004): `casa, tipster, grupo, banca, estado, origem, de, ate, apagadas, cursor`; inválido→default
- [ ] Menus de filtro por `<details>` com pickers próprios (sem `<select>` nativo)
- [ ] Pílulas de filtro ativo com remoção em um toque (navegação sem o param)
- [ ] Atalhos de período 7/30 dias/este mês gerando `de/ate` explícitos; seletor de período customizado próprio (sem `<input type="date">`)
- [ ] Testes: URL↔estado ida e volta; pílula removida atualiza URL e lista

**Acceptance**: copiar URL filtrada e abrir em aba nova reproduce exatamente a visão; `apagadas=1` sobrevive a qualquer navegação interna

---

### Issue 3: Tela Apostas (lista)

**Labels**: `semana-3`, `telas`, `apostas`
**Size**: L (6-8 hours)

**Files**: `src/features/apostas/`

**Tasks**:

- [ ] Cabeçalho de números (lucro, ROI) do resumo da API — **nenhum cálculo local**
- [ ] Três mini-gráficos CSS/SVG: lucro por dia, lucro por tipster, resultado de ontem (dados de `painel/metricas` — confirmar contrato em API-CONTRACTS)
- [ ] Linha da aposta (port de `linha_da_aposta`): número mono para valores, estado colorido, tipster em mono
- [ ] Cartões de aviso: foto duplicada; dúvidas de par pendentes (link para fila)
- [ ] "Mostrar mais" acumulativo com cursor; estado vazio com ação (onboarding: enviar export do Telegram)
- [ ] Mobile + desktop verificados; fotos com espaço reservado
- [ ] Component tests (MSW) para cada estado: vazio, erro 503, lista filtrada, apagadas

**Acceptance**: paridade visual/funcional com a lista do monólito verificada lado a lado; `?apagadas=1` lista só apagadas com restaurar

---

### Issue 4: Aposta — Detalhe e Correções

**Labels**: `semana-3`, `telas`, `apostas`
**Size**: L (4-6 hours)

**Files**: `src/features/apostas/ApostaPage.tsx`

**Tasks**:

- [ ] Detalhe completo: foto (espaço reservado, lazy), campos, origem, freebet explicada inline (stake zero, face no denominador do ROI), rastreabilidade de par com tipster
- [ ] Edição inline dos campos allowlist (`PATCH /apostas/{chave}`) com confirmação; invalidação+refetch antes de fechar (ADR 004)
- [ ] Apagar com confirmação → some da apuração; banner oferece restaurar; entrada na visão `?apagadas=1`
- [ ] Resolução de dúvida de par: "É a mesma" / "São apostas diferentes" (endpoint conforme API-CONTRACTS — ⚠️/❌ lá precisa estar resolvido antes)
- [ ] `estado` editável pelo fluxo dedicado quando aplicável

**Acceptance**: e2e: corrigir odd→refetch→número novo da API; apagar→restaurar volta à apuração; par resolvido sai da contagem de pendentes

---

### Issue 5: Tela Painel

**Labels**: `semana-3`, `telas`, `painel`
**Size**: L (6-8 hours)

**Files**: `src/features/painel/`

**Tasks**:

- [ ] Pílulas de período 7/30/90/tudo (URL params)
- [ ] Capa: números do resumo + odd média, fator de lucro, faixas de stake — todos de `GET /api/v1/painel`
- [ ] Barras grupo→tipster com `BarrasLucro` (espessura=√n dos dados da API); expansão de grupo revela tipsters
- [ ] `GraficoEvolucao` com a série real; `?tabela` mostra tabela completa por grupo
- [ ] Estados vazio/erro/503; CLS zero no carregamento (skeleton com dimensões fixas)

**Acceptance**: paridade com `/painel` do monólito lado a lado (mesmos números para o mesmo usuário de teste); Lighthouse CLS 0 nesta rota

---

### Issue 6: Hipotética (`/e-se`)

**Labels**: `semana-3`, `telas`
**Size**: S (1-2 hours)

**Tasks** (depende de lacuna ❌ do backend — endpoint de projeção hipotética):

- [ ] Visão "e se eu seguisse a stake do tipster?": real vs hipotético lado a lado
- [ ] Nenhum link da capa/ navegação principal — acesso só por URL direta (regra herdada)
- [ ] Estado vazio quando sem apostas com tipster

**Acceptance**: não linkada em nenhuma aba; números vêm do endpoint; documenta regra "nunca na capa" no comentário do módulo

---

### Issue 7: Mídia por Hash

**Labels**: `semana-3`, `api`
**Size**: S (1-2 hours)

**Tasks** (depende de ⚠️ endpoint de foto):

- [ ] Componente `<FotoAposta hash />`: URL de mídia autenticada da API, regex estrita de 64 hex (porta do guard de path traversal do monólito), espaço reservado por aspecto, lazy
- [ ] Falha de mídia vira placeholder estilizado, nunca quebra layout

**Acceptance**: nenhum reflow ao carregar foto (CLS 0 no e2e de detalhe); hash inválido nunca gera request

---

### Issue 8: e2e das Telas Centrais

**Labels**: `semana-3`, `testes`
**Size**: M (3-4 hours)

**Files**: `e2e/apostas.spec.ts`, `e2e/painel.spec.ts`

**Tasks**:

- [ ] Fluxos ADR 007: filtrar→pílulas→URL→reload; apagar→restaurar com `?apagadas=1`; painel períodos
- [ ] Viewports 390×844 e 1440×900
- [ ] Dados de seed previsíveis na API de teste (coordenar com backend se seed dedicado for preciso)

**Acceptance**: e2e verde no CI nos dois viewports; flake rate zero em 5 rodadas locais
