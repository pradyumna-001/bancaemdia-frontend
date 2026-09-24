# bancaemdia-frontend

Refatoração do frontend do Planilhador de Apostas. Single-page application **React + Vite + TypeScript (strict)** que consome a API versionada [`bancaemdia-api`](https://github.com/pradyumna-001/bancaemdia-api) (`/api/v1`, contratos em `docs/API.md` do backend).

Substitui a UI HTMX embarcada do monólito original (`planilhador/web/`), preservando paridade de funcionalidade, vocabulário (pt-BR) e as regras mensuráveis de qualidade de tela ("qualidade de tela é requisito, não polimento").

## Quickstart

Pré-requisitos: Node 22+, `pnpm`, Docker (para a API local ou apontar para staging).

```bash
make install        # pnpm install
make dev            # Vite dev server (API em VITE_API_URL)
make lint           # eslint + prettier --check
make typecheck      # tsc --noEmit
make test           # vitest
make test:e2e       # playwright
make build          # produção (dist/)
```

Copie `.env.example` para `.env` e aponte `VITE_API_URL` para a API (local: `http://127.0.0.1:8000`).

## Documentação

| Doc | Conteúdo |
|---|---|
| [`docs/adrs/README.md`](docs/adrs/README.md) | Índice de ADRs (registros de decisão e cronogramas de issues) |
| [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) | Mapeamento tela → endpoint `/api/v1` e lacunas a abrir no backend |
| [`docs/runbooks/`](docs/runbooks/) | Deploy, rollback e incidente |
| [`AGENTS.md`](AGENTS.md) | Regras invioláveis do projeto (dinheiro, vocabulário, paleta, estados) |

## Marcos (GitHub)

Milestones e issues ficam **neste repositório**. Os corpos completos das issues são os ADRs de planejamento 014–018; as issues do GitHub referenciam o ADR correspondente (`Implements ADR-014`, etc.).

| Milestone | ADR | Escopo |
|---|---|---|
| Semana 1 — Fundação | ADR 014 | Scaffold, tooling, design tokens, shell de navegação |
| Semana 2 — Auth e Cliente da API | ADR 015 | Auth, cliente tipado gerado do OpenAPI, páginas de erro |
| Semana 3 — Telas Centrais | ADR 016 | Apostas, Aposta (detalhe), Painel |
| Semana 4 — Fluxos de Entrada | ADR 017 | Enviar, Prints, Importar, Resultados, Revisão |
| Semana 5 — Conta e Endurecimento | ADR 018 | Banca, Casas, Configurações, Coleta, e2e, deploy |

## Convenções

- Todo PR fecha uma issue deste repo e referencia o ADR relevante ("Implements ADR-XXX").
- Decisões novas viram ADR antes do código (`docs/adrs/`): criar → revisar → aceitar → implementar → suplantar.
- Nenhuma lógica financeira no cliente: número calculado no frontend é bug (ver `AGENTS.md`).
