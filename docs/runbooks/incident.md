# Runbook — Incidente (Frontend)

## Severidade

- **S1**: app inteiro fora (tela branca, login impossível) → rollback imediato (`rollback.md`) e diagnóstico depois.
- **S2**: fluxo crítico degradado (upload, resultados, painel) → feature flag/manutenção, diagnóstico na sequência.
- **S3**: visual/pontual (gráfico errado, copy, ícone) → issue normal.

## Diagnóstico rápido

1. `curl -I` no domínio: headers e status do `index.html`.
2. Console do browser: violação de CSP? erro de chunk (`ChunkLoadError` após deploy = cache velho → invalidar/orientar refresh).
3. API: `GET /health` e `/ready` da `bancaemdia-api`; runbooks do backend se for lá.
4. Status da plataforma de hosting.

## Comunicação

- Banner de manutenção existe para 503 (ADR 005). Em S1/S2, postar no canal do usuário em pt-BR, sem jargão técnico.

## Pós-incidente

- Issue `incident` com linha do tempo, causa-raiz e ação preventiva → vira teste/CI quando possível.
