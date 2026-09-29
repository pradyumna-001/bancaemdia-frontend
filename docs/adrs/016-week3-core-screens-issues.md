# Semana 3: Telas Centrais — Milestones & GitHub Issues

> Revisão visual de 29/09/2026: aplicar os [critérios comuns do backlog](../research/backlog-visual.md) e o [ADR 006](006-visual-system.md). Paridade com o monólito significa tarefas e dados; a aparência segue a pesquisa aprovada.

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

#### Direção de uso e visual — GitHub #16

Source Sans 3 com algarismos tabulares nos valores comparáveis, alinhamento consistente e unidade explícita. Lucro/perda incluem sinal ou rótulo além da cor; estados usam texto canônico. Distinguir indisponível de zero.

**Aceite complementar:** Valores longos, negativos, zero e todos os estados permanecem legíveis nos dois temas; formatar não altera os valores financeiros recebidos.

---

### Issue 2: Filtros, Pílulas e Params de URL

**Labels**: `semana-3`, `lib`, `app`
**Size**: M (3-4 hours)

**Files**: `src/lib/params.ts`, `src/components/Filtros/`

**Tasks**:

- [ ] Schema de params (ADR 004): `casa, tipster, grupo, banca, estado, origem, de, ate, apagadas, cursor`; inválido→default
- [ ] Menus de filtro com pickers próprios acessíveis (sem `<select>` nativo); `<details>` pode organizar a expansão, sem substituir teclado/foco e semântica do picker
- [ ] Pílulas de filtro ativo com remoção em um toque (navegação sem o param)
- [ ] Atalhos de período 7/30 dias/este mês gerando `de/ate` explícitos; seletor de período customizado próprio (sem `<input type="date">`)
- [ ] Testes: URL↔estado ida e volta; pílula removida atualiza URL e lista

**Acceptance**: copiar URL filtrada e abrir em aba nova reproduce exatamente a visão; `apagadas=1` sobrevive a qualquer navegação interna

#### Direção de uso e visual — GitHub #17

Mostrar filtros frequentes primeiro e demais em expansão identificada, sem ocultar filtros ativos. Pílulas removíveis e limpar filtros têm efeito explícito; não apagar silenciosamente apagadas=1. Pickers próprios reutilizáveis precisam de labels, foco, teclado, Escape e estados vazio/erro; details pode ser contêiner, não substitui a semântica do controle.

**Aceite complementar:** URL↔controles↔pílulas coerentes após reload, compartilhar, voltar/avançar e valor inválido. Período e remoção funcionam por teclado e toque, com layout legível em 320px.

---

### Issue 3: Tela Apostas (lista)

**Labels**: `semana-3`, `telas`, `apostas`
**Size**: L (6-8 hours)

**Files**: `src/features/apostas/`

**Tasks**:

- [ ] Cabeçalho de números (lucro, ROI) do resumo da API — **nenhum cálculo local**
- [ ] Três mini-gráficos CSS/SVG: lucro por dia, lucro por tipster, resultado de ontem (dados de `painel/metricas` — confirmar contrato em API-CONTRACTS)
- [ ] Linha da aposta: valores em Source Sans 3 com números tabulares, estado com texto e cor semântica, tipster legível na mesma fonte de interface
- [ ] Cartões de aviso: foto duplicada; dúvidas de par pendentes (link para fila)
- [ ] "Mostrar mais" acumulativo com cursor; estado vazio com ação (onboarding: enviar export do Telegram)
- [ ] Mobile + desktop verificados; fotos com espaço reservado
- [ ] Component tests (MSW) para cada estado: vazio, erro 503, lista filtrada, apagadas

**Acceptance**: paridade de dados e tarefas com a lista do monólito, usando a direção visual do ADR 006; `?apagadas=1` lista só apagadas com restaurar

#### Direção de uso e visual — GitHub #18

A lista operacional é a prioridade. Cabeçalho compacto com resumo da API; mini-gráficos são secundários e podem ficar em seção expansível identificada. Linhas alinhadas no desktop e adaptação legível no celular mantêm informações essenciais e ações previsíveis. Sem um cartão decorativo para cada número.

**Aceite complementar:** Distinguir conta sem apostas, filtro sem resultados, carregamento e falha. Ações sugeridas correspondem ao estado; lista, avisos e filtros não perdem contexto após Mostrar mais. Paridade compara dados e tarefas, não pixels do monólito.

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

#### Direção de uso e visual — GitHub #19

Separar identificação/estado, valores, origem/foto e correções. Revelar edição quando solicitada, com Salvar/Cancelar e erro junto ao campo. Apagar fica visualmente separado da ação cotidiana; confirmação explica efeito e restaurar permanece encontrável.

**Aceite complementar:** Teclado e celular permitem corrigir, cancelar, apagar/restaurar e comparar pares sem perder filtros de retorno; foto não desloca campos durante carga.

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

#### Direção de uso e visual — GitHub #20

Começar por período e poucos números prioritários; métricas adicionais em grupos legíveis. Evolução e comparação por grupo respondem a perguntas distintas; detalhes de tipster e tabela ficam sob demanda com controles explícitos. Evitar mosaico de cartões e cores por decoração.

**Aceite complementar:** Mesmo período e dados da API em resumo/gráficos/tabela, sem totais locais; leitor de tela tem alternativa textual, carregamento preserva espaço e erro de uma seção não elimina dados válidos das outras.

---

### Issue 6: Hipotética (`/e-se`)

**Labels**: `semana-3`, `telas`
**Size**: S (1-2 hours)

**Tasks** (depende de lacuna ❌ do backend — endpoint de projeção hipotética):

- [ ] Visão "e se eu seguisse a stake do tipster?": real vs hipotético lado a lado
- [ ] Nenhum link da capa/ navegação principal — acesso só por URL direta (regra herdada)
- [ ] Estado vazio quando sem apostas com tipster

**Acceptance**: não linkada em nenhuma aba; números vêm do endpoint; documenta regra "nunca na capa" no comentário do módulo

#### Direção de uso e visual — GitHub #21

Identificar claramente cenário hipotético e suas premissas recebidas da API. Comparação com o real tem rótulos persistentes e mesmo período; não parecer saldo disponível ou previsão garantida.

**Aceite complementar:** Diferença entre real e hipotético entendida sem depender de cor; manter acesso direto e ausência na capa/navegação, com vazio/erro e retorno contextual.

---

### Issue 7: Mídia por Hash

**Labels**: `semana-3`, `api`
**Size**: S (1-2 hours)

**Tasks** (depende de ⚠️ endpoint de foto):

- [ ] Componente `<FotoAposta hash />`: URL de mídia autenticada da API, regex estrita de 64 hex (porta do guard de path traversal do monólito), espaço reservado por aspecto, lazy
- [ ] Falha de mídia vira placeholder estilizado, nunca quebra layout

**Acceptance**: nenhum reflow ao carregar foto (CLS 0 no e2e de detalhe); hash inválido nunca gera request

#### Direção de uso e visual — GitHub #22

Foto serve à conferência: proporção reservada, texto alternativo adequado e estado de indisponibilidade compreensível. Quando necessário, ampliar sem perder o ponto de leitura; controles de ampliação acessíveis.

**Aceite complementar:** Imagem lenta, quebrada ou hash inválido não desloca ações; se houver ampliação, Escape e retorno de foco funcionam em teclado e móvel.

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

#### Direção de uso e visual — GitHub #23

Evidências cobrem tarefas completas e hierarquia, não igualdade de screenshots antigos: localizar aposta, entender filtro, corrigir, restaurar e ler Painel. Incluir ambos os temas, nomes longos, valores extensos e listas vazias.

**Aceite complementar:** Capturas móvel/desktop com dados previsíveis, axe e verificações de teclado/foco, histórico e filtros; registrar limites de mocks e distinguir validação visual de teste com participantes.
