# bancaemdia-frontend

Refatoração do frontend do Planilhador de Apostas. Single-page application **React + Vite + TypeScript (strict)** que consome a API versionada [`bancaemdia-api`](https://github.com/pradyumna-001/bancaemdia-api) (`/api/v1`, contratos em `docs/API.md` do backend).

Substitui a UI HTMX embarcada do monólito original (`planilhador/web/`), preservando paridade de funcionalidade, vocabulário (pt-BR) e as regras mensuráveis de qualidade de tela ("qualidade de tela é requisito, não polimento").

## Quickstart

Pré-requisitos: Node 22.14+ (versão de referência em `.node-version`), pnpm **10.34.6** e GNU Make. Instale a versão fixada com `npm install --global pnpm@10.34.6`. O lockfile é obrigatório; `make install` usa `--frozen-lockfile`. Não é necessário ter API ativa, credenciais ou serviço pago para iniciar a tela provisória. Configure sua URL pública antes de iniciar.

```bash
make install        # instalação reproduzível e hook Husky
cp .env.example .env # no PowerShell: Copy-Item .env.example .env
make dev            # Vite em http://localhost:5173
make lint           # eslint + prettier --check
make typecheck      # tsc --noEmit
make test           # vitest run (sem watch)
pnpm exec playwright install --with-deps  # browsers e dependências de Linux
make test:e2e       # build + preview + Playwright (3 browsers × 2 viewports)
make build          # produção (dist/)
make gen-types      # contrato oficial da API → src/api/schema.d.ts
pnpm preview        # inspecionar dist/ em http://localhost:4173
pnpm format         # formatar arquivos
pnpm format:check   # verificar sem alterar
```

No Windows, use GNU Make 4.4.1 (por exemplo, o pacote `make` do Chocolatey) no PATH e `pnpm exec playwright install` para os navegadores. Todos os alvos, exceto `up`, são wrappers dos scripts pnpm e também podem ser executados diretamente no PowerShell (`pnpm lint`, `pnpm typecheck`, etc.). O nome do alvo e2e é literalmente `make test:e2e`; os dois-pontos estão escapados na definição do Makefile.

`make up` requer Docker Engine com containers Linux e Compose v2. WSL2/Docker Desktop é uma opção no Windows; não é necessário para os testes de frontend.

## Configuração por ambiente

O boot valida a configuração em `src/lib/config.ts` antes de montar a aplicação. Para desenvolvimento, basta um `.env` com `VITE_API_URL=http://127.0.0.1:8000`. Reinicie o Vite após editar o arquivo. Integração da API e sistema visual pertencem às próximas issues; não há cálculos financeiros, dados fictícios de domínio ou autenticação real nesta etapa.

| Variável              | Validação                                                    | Padrão quando omitida                            |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `VITE_API_URL`        | URL HTTP/HTTPS absoluta, sem credenciais, query ou fragmento | Obrigatória                                      |
| `VITE_APP_ENV`        | `development`, `staging` ou `production`                     | `development` no Vite dev; `production` no build |
| `VITE_UPLOAD_POLL_MS` | Inteiro de 1 a 2147483647 ms                                 | `1000`                                           |

Nenhuma variável aceita valor vazio ou `null`. `.env.example` explica as variáveis públicas; as entradas `VITE_AUTH_*` estão reservadas para a #11 e ainda não são consumidas. Nunca copie segredos do `.env` do backend para o frontend.

Em um **build publicado**, o boot busca `/config.json` e aplica seus campos sobre os valores compilados de `import.meta.env`. O arquivo versionado `public/config.json` contém `{}`, preservando os valores do build. Para promover o mesmo `dist/` ou imagem de staging para produção sem recompilar, substitua apenas esse arquivo no servidor:

```json
{
  "VITE_API_URL": "https://api.example.com",
  "VITE_APP_ENV": "production",
  "VITE_UPLOAD_POLL_MS": 1000
}
```

Somente essas três chaves são aceitas no JSON. O artefato pode ser compilado sem URL, desde que ela seja fornecida no runtime. O modo dev não busca esse arquivo. Clientes futuros acessam `getConfig()` após o boot; não leem variáveis diretamente.

O nginx serve `/config.json` com `Cache-Control: no-store`, sem fallback para HTML. A busca tem limite de cinco segundos e não repete automaticamente. Arquivo indisponível, JSON inválido ou variável inválida interrompem o boot com mensagem em português e botão **Tentar novamente**, sem montar a aplicação ou revelar o conteúdo recebido. Veja a decisão no [ADR 008](docs/adrs/008-ci-cd-deploy.md).

A validação local e em Linux, incluindo 42 e2e e promoção da mesma imagem entre ambientes, está registrada em [docs/config-validation.md](docs/config-validation.md).

## Rotas e sessão provisória

O data router oferece 19 páginas provisórias em português. As sete abas vêm de `src/app/nav.ts`; a barra visual será implementada na #6. Uma URL desconhecida mostra 404 com ações de retorno, mesmo sem sessão.

| Acesso    | Rotas                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Protegido | `/`, `/painel`, `/enviar`, `/coleta`, `/banca`, `/resultados`, `/revisao`, `/aposta/:chave`, `/configuracoes`, `/sistema`, `/senha`, `/sair` |
| Público   | `/tutorial`, `/extensao`, `/login`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha`, `/confirmar-email`                                 |

O provedor de sessão ainda não foi integrado: abrir `/` leva a `/login?destino=%2F`. Nenhum login ou logout real é executado. A função de consulta de sessão pode ser injetada nos testes; o build usa sempre o estado sem sessão e não contém atalho por URL, storage ou variável de ambiente.

O destino mantém filtros e fragmento, mas precisa passar por `src/auth/destinoInterno.ts`: somente rotas internas de conteúdo cadastradas são aceitas. Caminhos de autenticação, URLs externas e caminhos ambíguos caem em `/`. O loader do login entrega o destino já validado para a futura tela de conta.

Cada rota tem um error boundary com mensagem segura, tentativa explícita e links de retorno. A apresentação inicial usa CSS de layout sem cores literais; tokens, fontes e temas são escopo da #4, e ilustrações finais de erros, da #13.

O `QueryClientProvider` compartilha um cliente por aplicação. Listas ficam frescas por 30 segundos, `painel`/`metricas` por 60 e `revisao` por zero. Queries representam GETs idempotentes: 500 permite uma repetição; 503, três com backoff exponencial e jitter; outros erros não repetem automaticamente. Mutations não repetem. A integração de erros HTTP, `Retry-After` e banners será feita na #10 sem duplicar a camada de retry.

## Estrutura e testes

- `src/main.tsx` e `src/app/App.tsx`: boot validado, data router e QueryClientProvider.
- `src/app/routes.tsx`, `paths.ts` e `nav.ts`: rotas provisórias e catálogo único das abas.
- `src/auth/`: consulta provisória de sessão, guard e validação de destino interno.
- `src/api/schema.d.ts`: tipos gerados, sem cliente ou shapes manuais.
- `tests/setup.ts`: Testing Library/jsdom; testes de componente ficam junto do código.
- `tests/e2e/`: Playwright contra o **build de produção**, Chromium/Firefox/WebKit em 390×844 e 1440×900. Verifica configuração, rotas públicas/protegidas, URL de retorno, 404, teclado, axe e overflow. Testes de componente cobrem todas as páginas com sessão injetada, falhas de loader/componente e recuperação. Não usa mocks da API porque ainda não há integração.
- `vite.config.ts`, `tsconfig.json` e `eslint.config.mjs`: Vite 6, TS strict com `noUncheckedIndexedAccess`, hooks React e acessibilidade.

React Router 7 e TanStack Query fornecem roteamento e cache; openapi-fetch e MSW estão instalados para a integração da API. Vitest 3 e plugin React 4 são compatíveis com Vite 6. O peer `@testing-library/dom` é explícito; jest-dom 6.9.1 evita a versão 6.10.0 descontinuada. ESLint 9 atende aos peers dos plugins atuais (a atualização de major exige revisar esses peers). O postinstall do esbuild é permitido; o postinstall informativo do MSW é ignorado, pois não há worker de navegador neste scaffold.

## Geração de tipos

`make gen-types` baixa o [snapshot OpenAPI oficial de bancaemdia-api](https://github.com/pradyumna-001/bancaemdia-api/blob/bd055417459f796fed960b5b37efb33a9744419f/tests/contract/schemas/openapi.json), fixado no commit `bd055417459f796fed960b5b37efb33a9744419f` já integrado em `main`. A geração usa `openapi-typescript`, formata a saída e grava `src/api/schema.d.ts`, versionado. Não é um contrato inventado nem depende de PR pendente. A fonte fixada torna a regeneração reproduzível sem iniciar banco, Redis ou auth; requer acesso à rede.

Para usar o contrato de uma API local conforme ADR 003:

```bash
# Clone bancaemdia-api, prepare seu .env conforme o README daquele repo e inicie:
make -C ../bancaemdia-api up
make gen-types OPENAPI_SOURCE=http://127.0.0.1:8000/openapi.json
# Alternativa offline: snapshot de um checkout verificado do backend
pnpm gen-types ../bancaemdia-api/tests/contract/schemas/openapi.json
make typecheck
```

Um argumento de URL ou arquivo substitui a fonte padrão. Não inclua tokens na URL. Ao atualizar o contrato, revise o diff e atualize a referência fixada em `scripts/gen-types.mjs` e nesta documentação. Falhas de leitura/geração retornam exit code diferente de zero e preservam o arquivo anterior.

## Hooks

`pnpm install` prepara Husky. Cada commit executa `pnpm precommit`: lint-staged verifica ESLint/Prettier nos arquivos staged e roda o typecheck completo. Os checks não reescrevem arquivos e lint-staged usa `--no-stash`. Corrija falhas com `pnpm format` ou na origem e faça stage novamente.

A configuração `.pre-commit-config.yaml` existente também é executável:

```bash
python -m pip install pre-commit
python -m pre_commit run --all-files
```

Ela verifica whitespace, EOF, arquivos grandes, LF, lint, formato e tipos. Não execute `pre-commit install` sobre o Husky: há um único dono do hook. Antes de push, rode `make lint`, `make typecheck` e `make test`. **Não existe workflow de CI permanente**; a implementação dos gates, budgets e deploy pertence à #8. A validação pontual da #1 em Linux, incluindo os seis e2e, Docker sem root e `make up` com a API, está registrada em [docs/scaffold-validation.md](docs/scaffold-validation.md).

## Imagem estática e API local

```bash
docker build -t bancaemdia-frontend:local .
docker run --rm -d --name bancaemdia-frontend-smoke -p 127.0.0.1:8080:8080 --mount "type=bind,source=$(pwd)/config/local.json,target=/usr/share/nginx/html/config.json,readonly" bancaemdia-frontend:local
docker exec bancaemdia-frontend-smoke id   # uid=101; nunca root
docker exec bancaemdia-frontend-smoke nginx -t
curl -f http://127.0.0.1:8080/
curl -f http://127.0.0.1:8080/rota-de-smoke # fallback para index.html
docker stop bancaemdia-frontend-smoke
```

O Dockerfile compila com Node/pnpm e serve somente `dist/` com nginx unprivileged na porta 8080. A imagem define `USER 101:101`, healthcheck, CSP restrita à mesma origem, proteção contra MIME sniffing, referrer policy, index sem cache e assets com hash/cache imutável. Um asset inexistente retorna 404. A allowlist de conexão da API será configurada junto da integração; não há `unsafe-inline`, CDN ou curingas de conexão no scaffold.

`docker compose up -d --build` inicia apenas o SPA em `http://127.0.0.1:8080`, com filesystem somente leitura e `/tmp` temporário. Monta `config/local.json` como configuração pública local. Para outro ambiente, defina `FRONTEND_CONFIG_FILE` com o caminho absoluto de um JSON existente antes de executar o Compose; o arquivo é montado somente para leitura. Essa variável pertence ao Compose e não entra no bundle. Em produção, a origem da API também deve estar na allowlist da CSP do servidor quando a integração for implementada; o JSON não altera políticas de segurança.

Para iniciar também a stack **existente** da API:

```bash
# Requer checkout do backend com .env preparado segundo seu README.
make up API_DIR=../bancaemdia-api
```

`API_DIR` pode ser absoluto (útil em worktrees). O alvo usa o Compose e `.env` daquele checkout antes de subir o frontend; não gera, copia ou altera segredos. Para encerrar, use `docker compose down` neste repo e no backend, sem `-v` para preservar dados. Isso prepara a execução local, sem implementar conexão, auth ou telas da API.

## Documentação

| Doc                                              | Conteúdo                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [`docs/adrs/README.md`](docs/adrs/README.md)     | Índice de ADRs (registros de decisão e cronogramas de issues)          |
| [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) | Mapeamento tela → endpoint `/api/v1` e lacunas a abrir no backend      |
| [`docs/runbooks/`](docs/runbooks/)               | Deploy, rollback e incidente                                           |
| [`AGENTS.md`](AGENTS.md)                         | Regras invioláveis do projeto (dinheiro, vocabulário, paleta, estados) |

## Marcos (GitHub)

Milestones e issues ficam **neste repositório**. Os corpos completos das issues são os ADRs de planejamento 014–018; as issues do GitHub referenciam o ADR correspondente (`Implements ADR-014`, etc.).

| Milestone                        | ADR     | Escopo                                                  |
| -------------------------------- | ------- | ------------------------------------------------------- |
| Semana 1 — Fundação              | ADR 014 | Scaffold, tooling, design tokens, shell de navegação    |
| Semana 2 — Auth e Cliente da API | ADR 015 | Auth, cliente tipado gerado do OpenAPI, páginas de erro |
| Semana 3 — Telas Centrais        | ADR 016 | Apostas, Aposta (detalhe), Painel                       |
| Semana 4 — Fluxos de Entrada     | ADR 017 | Enviar, Prints, Importar, Resultados, Revisão           |
| Semana 5 — Conta e Endurecimento | ADR 018 | Banca, Casas, Configurações, Coleta, e2e, deploy        |

## Convenções

- Todo PR fecha uma issue deste repo e referencia o ADR relevante ("Implements ADR-XXX").
- Decisões novas viram ADR antes do código (`docs/adrs/`): criar → revisar → aceitar → implementar → suplantar.
- Nenhuma lógica financeira no cliente: número calculado no frontend é bug (ver `AGENTS.md`).
