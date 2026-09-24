# ADR 004: Estado, URL e Cache — URL como fonte dos filtros, política de cache

## Status
Proposed

## Context

O monólito auditava repetidamente perda de estado de filtro ("as pílulas carregam a URL inteira"); `?apagadas=1` viajava em todo link para a visão de apagadas não sumir. Perder estado silenciosamente era classificado como bug de produto. No SPA, o risco migra para: caches de query obsoletos após mutação, e estado guardado em componente que morre na navegação.

## Decision

### URL
1. Todo estado de filtro/período/paginação visível na URL como query params: `casa`, `tipster`, `grupo`, `banca`, `estado`, `origem`, `de`, `ate`, `apagadas`, `cursor`.
2. Parsing com schema (zod ou `URLSearchParams` + coercers em `src/lib/params.ts`): **param inválido → valor padrão** (nunca 422 nem crash — regra 19 do AGENTS, espelho da web antiga).
3. Pílulas de filtro ativas derivam dos params; remover pílula = navegar sem o param. Atalhos de período (7/30 dias, este mês) geram params explícitos; sem `<input type=date>` nativo (componente próprio).

### Cache de servidor (TanStack Query)
4. `queryKey` = `[recurso, paramsNormalizados]` — filtro novo é cache novo.
5. `staleTime`: 30s listas; 60s painel/métricas; 0 para revisão (fila muda por ação própria).
6. **Read-your-writes** (espelho do backend ADR-009 — escritas no primário): toda mutação (`mutateAsync`) invalida e aguarda `refetch` das queries afetadas antes de fechar o formulário/confirmar o toast. Sem dados próprios escritos localmente que não vieram da API.
7. Mutations destrutivas (apagar aposta, zerar tudo) usam confirmação explícita; ação reversível (restaurar aposta, desfazer resultado) fica acessível conforme contrato.

### Estado local
8. Apenas estado efêmero de UI (modal aberto, draft de formulário, fila de desfazer da sessão de Resultados) vive em componente/contexto. `sessionStorage` para a fila de desfazer de Resultados (sobrevive F5, morre ao fechar aba — paridade com o hidden field do monólito).

## Consequences

- Link compartilhável de qualquer lista filtrada (suporte e debug mais fáceis).
- Sem "dados velhos após salvar": toda mutação termina com dados vindos do servidor.
- Trade-off aceito: mais `refetch` que o mínimo teórico — consistência óbvia vale mais que economia de requests neste produto financeiro.
