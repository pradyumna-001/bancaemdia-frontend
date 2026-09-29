# ADR 006: Sistema Visual — Tokens de Paleta, Tipografia Vendida, SVG Próprio (Sem Chart Lib)

## Status

Proposed

## Context

O monólito tinha sistema visual autoral e disciplinado: `paleta.css` como único lugar com cor (teste proibia cor fora dele), paleta C1 "azul contido" (família Nubank/Monzo/Wise), tema escuro padrão + claro, escala de 4 tamanhos tipográficos, espaçamento 4/8/16/24/32, raio 14px, gráficos 100% SVG/CSS server-side (sem chart lib), regra de barra com **espessura = √(nº de apostas)**, ícones como macros inline SVG, fontes vendidas (Bricolage Grotesque + JetBrains Mono). Marca: wordmark "Planilhador" cortado por peso — **atenção**: o repositório novo usa a marca **bancaemdia**; a questão de marca/n novo no produto é decisão do dono e fica registrada como item aberto (issue Semana 1).

## Decision

1. **Tokens**: `src/styles/tokens.css` com CSS custom properties portadas da paleta C1 (`--lucro`, `--perda`, `--tinta`, `--fundo`, superfícies, foco), dois temas (`data-tema="escuro"` padrão / `"claro"`), script pre-paint inline no `index.html` para evitar flash.
2. **Lint de paleta**: regra ESLint custom + varredura CI proíbem literal de cor (`#hex`, `rgb(`, `hsl(`) fora de `tokens.css` — port do teste de paleta única do monólito.
3. **Tipografia**: woff2 vendidas em `public/fontes/` (Bricolage Grotesque 400/700; JetBrains Mono 500/700; licenças OFL copiadas), `font-display: swap`, escala de 4 tamanhos, números sempre em mono.
4. **Espaçamento/raio**: escala 4/8/16/24/32 e raio 14 como tokens e utilitários; nada de px solto em componente (lint de design-token inclui espaçamento? — escopo mínimo: cor apenas no lint; espaçamento por revisão).
5. **Gráficos**: componentes SVG próprios em `src/components/graficos/`:
   - `GraficoEvolucao` — linha de lucro acumulado, eixo zero sempre desenhado, x proporcional ao dia de calendário (port de `_grafico_da_evolucao`).
   - `BarrasLucro` — barras horizontais de lucro por grupo→tipster, comprimento ∝ |lucro|, espessura = √n, crescem do zero no sentido do sinal.
   - Mini-gráficos da home (por dia, por tipster, ontem) puramente CSS/SVG.
   - **Proibido** importar Chart.js/Recharts/D3-plot.
6. **Ícones**: `Icone.tsx` com registro único de nomes (port do macro `icone()`); ícone novo não registrado falha em teste de snapshot.
7. **Ilustrações**: SVG desenhado à mão em 2 cores; nenhum print/screenshot fabricado em tutorial (política herdada).
8. **Sem CSS framework** (Tailwind/Bootstrap) — CSS próprio por componente com tokens.

## Consequences

- Migração de identidade: ao portar `paleta.css`, nomes de tokens são renomeados para kebab-case semântico; o arquivo vira a única fonte, como antes.
- Sem chart lib: bundle menor e consistência visual garantida; custo é manter geometria SVG própria (aceito — é a identidade do produto).
- Marca: wordmark e favicon finais dependem do item aberto de branding (ver ADR 014 Issue 5).
