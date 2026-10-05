# ADR 005: Erros, Timeouts e Retry — Fallbacks de Query Params, 429/503, Páginas de Erro

## Status

Proposed

## Context

Espelho client-side do backend ADR-008 (circuit breakers, timeouts, rate limiting). A UI antiga tinha páginas estilizadas 404/405/500 em pt-BR e nunca 422 por query param (inválido caía para default). O SPA precisa do equivalente com Error Boundaries e regras explícitas por status.

## Decision

### Hierarquia de falha

1. **Erro de componente** → React Error Boundary por rota: página estilizada "deu errado" com ação "tentar de novo" e link para início; erro logado (console + provider futuro).
2. **Erro de rota** → 404 estilizado ("não achei"), espelho de `nao_achei.html`.
3. **Erro de API** por status (via `ApiError` do ADR 003):

| Status             | Comportamento da UI                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401                | Reautenticar → login com `destino` interno                                                                                                                                  |
| 403/404 de recurso | Página/card estilizado, link de volta                                                                                                                                       |
| 409 (conflito)     | Mensagem de domínio ("aposta já alterada") + botão "Recarregar dados"                                                                                                       |
| 413                | "Arquivo grande demais" com limite informado                                                                                                                                |
| 422                | Tratado como inválido de formulário **apenas em formulário**; em navegação/query param, fallback para default (o 422 da API em navegação indica bug — telemetria, não tela) |
| 429                | Banner "Muitas requisições, tente em Xs" usando `Retry-After`; botões de ação bloqueados durante a janela                                                                   |
| 500                | Página "deu errado"; GETs idempotentes retentam 1× automático                                                                                                               |
| 503                | Banner de manutenção/indisponível; GETs idempotentes retentam com backoff (máx. 3, exponencial + jitter) e depois param                                                     |
| Rede/offline       | Indicador "sem conexão"; formulários desabilitados; retry manual                                                                                                            |

4. **Nunca**: JSON cru, stack trace, spinner eterno, tela branca.

### Timeouts

- GET: 10s; POST leve: 15s; upload/arquivo: 60s. Timeout é erro de primeira classe (mensagem "demorou demais — tente de novo"), abortável pelo usuário.

### Tela de carregamento

- Estados de loading têm skeleton com espaço reservado (regra CLS, ADR 001); polling de job mostra progresso real (ADR 003).

## Consequences

- Matriz status→comportamento revisada em PRs que tocam `client.ts`.
- e2e (ADR 007) simula 429/503/offline com MSW para garantir as regras.
