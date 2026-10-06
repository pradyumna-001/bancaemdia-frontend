# bancaemdia-frontend

Refatoração do frontend do Planilhador de Apostas. Single-page application **React + Vite + TypeScript (strict)** que consome a API versionada [`bancaemdia-api`](https://github.com/pradyumna-001/bancaemdia-api) (`/api/v1`, contratos em `docs/API.md` do backend).

SPA para as tarefas atuais de bancaemdia-api: apostas, contas/titulares, caixa, revisão, entrada, assinatura, análises e ferramentas. Preserva vocabulário pt-BR e qualidade de tela; o monólito é referência histórica, não limite de escopo. Ver ADR 019 e docs/backlog.

## Quickstart

Pré-requisitos: Node 22.22.0+ (versão de referência em `.node-version`), pnpm **10.34.6** e GNU Make. Instale a versão fixada com `npm install --global pnpm@10.34.6`. O lockfile é obrigatório; `make install` usa `--frozen-lockfile`. Não é necessário ter API ativa, credenciais ou serviço pago para iniciar a tela provisória. Configure sua URL pública antes de iniciar.

```bash
make install        # instalação reproduzível e hook Husky
cp .env.example .env # no PowerShell: Copy-Item .env.example .env
make dev            # Vite em http://localhost:5173
make lint           # eslint + prettier --check
make typecheck      # tsc --noEmit
make test           # vitest run (sem watch)
make test:coverage  # suíte + mínimo 80% por arquivo em lib/features/api/auth
pnpm exec playwright install --with-deps  # browsers e dependências de Linux
make test:e2e       # build + preview + Playwright (3 browsers × 2 viewports)
make build          # produção (dist/)
make check:bundle   # JS inicial <=200.000 bytes gzip
make measure:lighthouse # baseline mobile/desktop do build público
make gen-types      # contrato oficial da API → src/api/schema.d.ts
pnpm preview        # inspecionar dist/ em http://localhost:4173
pnpm format         # formatar arquivos
pnpm format:check   # verificar sem alterar
```

No Windows, use GNU Make 4.4.1 (por exemplo, o pacote `make` do Chocolatey) no PATH e `pnpm exec playwright install` para os navegadores. Todos os alvos, exceto `up`, são wrappers dos scripts pnpm e também podem ser executados diretamente no PowerShell (`pnpm lint`, `pnpm typecheck`, etc.). O nome do alvo e2e é literalmente `make test:e2e`; os dois-pontos estão escapados na definição do Makefile.

`make up` requer Docker Engine com containers Linux e Compose v2. WSL2/Docker Desktop é uma opção no Windows; não é necessário para os testes de frontend.

## Configuração por ambiente

O boot valida a configuração em `src/lib/config.ts` antes de montar a aplicação. Para desenvolvimento, basta um `.env` com `VITE_API_URL=http://127.0.0.1:8000`. Reinicie o Vite após editar o arquivo. O provedor consulta a sessão real da API; sem backend de identidade configurado, permanece anônimo com recuperação segura. Páginas de domínio ainda estão em preparação; não há cálculos financeiros ou dados fictícios no produto. Publicação depende das integrações descritas no [contrato de sessão](docs/contracts/sessao.md).

| Variável              | Validação                                                    | Padrão quando omitida                            |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `VITE_API_URL`        | URL HTTP/HTTPS absoluta, sem credenciais, query ou fragmento | Obrigatória                                      |
| `VITE_APP_ENV`        | `development`, `staging` ou `production`                     | `development` no Vite dev; `production` no build |
| `VITE_UPLOAD_POLL_MS` | Inteiro de 1 a 2147483647 ms                                 | `1000`                                           |

Nenhuma variável aceita valor vazio ou `null`. `.env.example` explica as variáveis públicas. A identidade do [ADR003](docs/adrs/003-api-client-typing-session.md) é operada pelo backend: o SPA não configura emissor/client ID/audience em `VITE_AUTH_*` nem recebe tokens. Nunca copie segredos do `.env` do backend para o frontend. [Contrato da #49 e pendências de publicação](docs/contracts/identidade.md).

Em um **build publicado**, o boot busca `/config.json` e aplica seus campos sobre os valores compilados de `import.meta.env`. O arquivo versionado `public/config.json` contém `{}`, preservando os valores do build. Para promover o mesmo `dist/` ou imagem de staging para produção sem recompilar, substitua apenas esse arquivo no servidor:

```json
{
  "VITE_API_URL": "https://bancaemdia.example",
  "VITE_APP_ENV": "production",
  "VITE_UPLOAD_POLL_MS": 1000
}
```

Somente essas três chaves são aceitas no JSON. Em produção, a URL é a origem do próprio SPA, com proxy para `/auth/*` e `/api/*`. O artefato pode ser compilado sem URL, desde que ela seja fornecida no runtime. O modo dev não busca esse arquivo. Clientes acessam `getConfig()` após o boot; não leem variáveis diretamente.

O nginx serve `/config.json` com `Cache-Control: no-store`, sem fallback para HTML. A busca tem limite de cinco segundos e não repete automaticamente. Arquivo indisponível, JSON inválido ou variável inválida interrompem o boot com mensagem em português e botão **Tentar novamente**, sem montar a aplicação ou revelar o conteúdo recebido. Veja a decisão no [ADR 008](docs/adrs/008-ci-cd-deploy.md).

A validação local e em Linux, incluindo 42 e2e e promoção da mesma imagem entre ambientes, está registrada em [docs/config-validation.md](docs/config-validation.md).

## Rotas e sessão

O data router e o shell usam ABAS em src/app/nav.ts. Os sete destinos principais e os novos destinos secundários têm elegibilidade desktop/mobile; Contas e titulares, Calculadoras, Assinatura e Configurações ficam em Opções/Mais. Rotas filhas de Painel e Configurações permanecem na respectiva área. As páginas de domínio continuam em preparação, sem operações simuladas. URL desconhecida mostra 404 recuperável.

| Acesso    | Rotas                                                                                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protegido | `/`, `/painel`, `/enviar`, `/coleta`, `/banca`, `/resultados`, `/revisao`, `/aposta/:chave`, `/configuracoes`, `/configuracoes/conexoes`, `/configuracoes/privacidade`, `/contas`, `/contas/:titularId`, `/assinatura`, `/calculadoras`, `/painel/analises`, `/painel/metas`, `/sistema`, `/senha`, `/sair` |
| Público   | `/tutorial`, `/extensao`, `/login`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha`, `/confirmar-email`                                                                                                                                                                                                |

ProvedorAuth consulta `/auth/session` por cookie e só libera o guard após identidade válida. Sem sessão, abrir `/` leva a `/login?destino=%2F`. Nas páginas existentes, **Entrar com minha conta** inicia login hospedado e **Confirmar saída** chama logout real com CSRF; telas completas são #12. URL, storage e variáveis públicas não liberam sessão simulada. Consultas injetadas pertencem somente aos testes/fixture isolados.

O destino mantém filtros e fragmento, mas precisa passar por `src/auth/destinoInterno.ts`: somente rotas internas de conteúdo cadastradas são aceitas. Caminhos de autenticação, URLs externas e caminhos ambíguos caem em `/`. O fragmento fica transitoriamente em sessionStorage, sem token/prova, por até dez minutos e é consumido uma vez; a API recebe apenas caminho/query.

Cada rota tem recuperação com mensagem segura, SVG próprio e retorno contextual, preservando filtros/seção não secretos. As páginas protegidas usam boundary filho dentro de RequireSession/Shell; falha no guard/layout usa boundary externo. Abrir novamente é GET explícito; 404/405 e escrita incerta não oferecem repetição. [Contrato da #13](docs/contracts/erros-de-rota.md). Tokens, fontes, temas e marca são compartilhados. Assinatura e sessão são responsabilidades separadas; acesso somente de leitura não é logout.

O `QueryClientProvider` compartilha um cliente por aplicação. Listas ficam frescas por 30 segundos, `painel`/`metricas` por 60 e `revisao` por zero. GETs seguros: 500 permite uma repetição; 503 três; 429 duas; rede/timeout uma, com backoff e Retry-After. Mutations/cancelamentos não repetem. O contador de Revisão usa API tipada e contexto atual. Troca/logout limpa queries e mutations e remonta dados privados; responses anteriores são descartadas mesmo após parsing. Renovação é serializada entre abas, com consulta dentro da trava e no máximo uma recuperação de GET da mesma pessoa/família.

`src/features/enviar/useJob.ts` acompanha um UUID de upload conhecido, com consulta tipada e um loop compartilhado por sessão, backoff, limites e retomada explícita. Encerrar a observação não cancela o processamento nem reenvia arquivo. A projeção preserva progresso/parcial/vazio e exclui custos/estimativas/erro bruto; logout/troca limpa todos os observadores. [Contrato da #15](docs/contracts/jobs-upload.md). A tela de Enviar continua na #24; não há mudança visual nesta base técnica.

As evidências de testes, navegação e nginx estão em [docs/router-validation.md](docs/router-validation.md).

## Estrutura e testes

- `src/main.tsx` e `src/app/App.tsx`: boot validado, data router e QueryClientProvider.
- `src/app/routes.tsx`, `paths.ts` e `nav.ts`: rotas provisórias e catálogo único das abas.
- `src/auth/`: ProvedorAuth, controle de sessão/isolamento, transporte validado e destino interno.
- `src/api/schema.d.ts`: tipos gerados, sem cliente ou shapes manuais.
- `tests/setup.ts`: Testing Library/jsdom; testes de componente ficam junto do código.
- `tests/e2e/`: Playwright contra o **build de produção**, Chromium/Firefox/WebKit em 390×844 e 1440×900. Verifica configuração, rotas públicas/protegidas, URL de retorno, 404, teclado, axe e overflow. Testes de componente cobrem todas as páginas com sessão injetada, falhas de loader/componente e recuperação. A fixture isolada do shell simula sessão e contador para validar apresentação; o build público não pode liberar essa sessão. Isso não comprova integração da API.
- `vite.config.ts`, `tsconfig.json` e `eslint.config.mjs`: Vite 6, TS strict com `noUncheckedIndexedAccess`, hooks React e acessibilidade.

React Router 7 e TanStack Query fornecem roteamento e cache; openapi-fetch e MSW estão instalados para a integração da API. Vitest 3 e plugin React 4 são compatíveis com Vite 6. O peer `@testing-library/dom` é explícito; jest-dom 6.9.1 evita a versão 6.10.0 descontinuada. ESLint 9 atende aos peers dos plugins atuais (a atualização de major exige revisar esses peers). O postinstall do esbuild é permitido; o postinstall informativo do MSW é ignorado, pois não há worker de navegador neste scaffold.

## Geração de tipos

`make gen-types` baixa o [snapshot OpenAPI oficial de bancaemdia-api](https://github.com/pradyumna-001/bancaemdia-api/blob/bd055417459f796fed960b5b37efb33a9744419f/tests/contract/schemas/openapi.json), fixado no commit `bd055417459f796fed960b5b37efb33a9744419f` já integrado em `main`. [config/api-contract.json](config/api-contract.json) fixa commit e SHA-256 dos bytes. Após conferir o hash, `openapi-typescript` gera `src/api/schema.d.ts` e políticas de upload/idempotência em `src/api/operations.generated.ts`, ambos versionados e verificados por drift na CI. Nenhum schema de PR é promovido ou concatenado.

Para reproduzir sem rede, use o mesmo snapshot pinado de um checkout verificado:

```bash
pnpm gen-types ../bancaemdia-api/tests/contract/schemas/openapi.json
make typecheck
```

Um arquivo local também precisa corresponder ao hash aprovado. URLs alternativas e referências flutuantes são recusadas. Para atualizar a API, verificar integração/compatibilidade, atualizar commit/hash em `config/api-contract.json`, regenerar e revisar os dois diffs e as consumidoras. Falhas de leitura/hash/geração ocorrem antes de gravar saídas. Ver [cliente e contrato](docs/contracts/cliente-api.md).

## Hooks

`pnpm install` prepara Husky. Cada commit executa `pnpm precommit`: lint-staged verifica ESLint/Prettier nos arquivos staged e roda o typecheck completo. Os checks não reescrevem arquivos e lint-staged usa `--no-stash`. Corrija falhas com `pnpm format` ou na origem e faça stage novamente.

A configuração `.pre-commit-config.yaml` existente também é executável:

```bash
python -m pip install pre-commit
python -m pre_commit run --all-files
```

Ela verifica whitespace, EOF, arquivos grandes, LF, lint, formato e tipos. Não execute `pre-commit install` sobre o Husky: há um único dono do hook. Antes de push, rode `make lint`, `make typecheck` e `make test`.

**CI permanente:** `.github/workflows/ci.yml` executa em push e pull request, inclusive mudanças só de documentação. Valida o commit da branch com lint, tipos, testes, build, geração do contrato, e2e, pre-commit e nginx/Docker. Relatórios e screenshots ficam nos artefatos de cada execução. Budgets, cobertura mínima, proteção de branch e deploy continuam na #8.

**Regra de entrega:** nenhum PR pode ser declarado pronto em rascunho ou com testes/checks pendentes ou falhando. Após o último push, aguarde todos os checks do commit final, incluindo integrações externas. Rascunho temporário durante o trabalho é permitido; impedimentos fora do controle devem ser explicitados sem declarar aprovação. Ver AGENTS regra 28.

A validação histórica da #1 em Linux, incluindo os seis e2e, Docker sem root e `make up` com a API, está registrada em [docs/scaffold-validation.md](docs/scaffold-validation.md).

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

O Dockerfile compila com Node/pnpm e serve somente `dist/` com nginx unprivileged na porta 8080. A imagem define `USER 101:101`, healthcheck, CSP restrita à mesma origem, proteção contra MIME sniffing, referrer policy, index sem cache e assets com hash/cache imutável. Um asset inexistente retorna 404. A publicação usa proxy de mesma origem para API/identidade; não há `unsafe-inline`, CDN ou curingas de conexão.

`docker compose up -d --build` inicia apenas o SPA em `http://127.0.0.1:8080`, com filesystem somente leitura e `/tmp` temporário. Monta `config/local.json` apontando à mesma origem para preservar CSP `connect-src 'self'`. Sem proxy/API, `/auth/*` e `/api/*` retornam 503 JSON/no-store, nunca HTML da SPA; a entrada oferece tentar novamente sem navegar para um serviço indisponível. Para outro ambiente, defina `FRONTEND_CONFIG_FILE` com o caminho absoluto de um JSON existente antes de executar o Compose; o arquivo é montado somente para leitura. Essa variável pertence ao Compose e não entra no bundle. Em produção, configurar o proxy de mesma origem para ambos os prefixos; o JSON não altera políticas de segurança.

Para iniciar também a stack **existente** da API:

```bash
# Requer checkout do backend com .env preparado segundo seu README.
make up API_DIR=../bancaemdia-api
```

`API_DIR` pode ser absoluto (útil em worktrees). O alvo usa o Compose e `.env` daquele checkout antes de subir o frontend; não gera, copia ou altera segredos. Para encerrar, use `docker compose down` neste repo e no backend, sem `-v` para preservar dados. O proxy de mesma origem ainda precisa ser configurado para conectar essas duas stacks; subir processos não comprova a integração de identidade.

## Documentação

| Doc                                              | Conteúdo                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [`docs/adrs/README.md`](docs/adrs/README.md)     | Índice de ADRs (registros de decisão e cronogramas de issues)          |
| [`docs/API-CONTRACTS.md`](docs/API-CONTRACTS.md) | Mapeamento tela → endpoint `/api/v1` e lacunas a abrir no backend      |
| [`docs/runbooks/`](docs/runbooks/)               | Deploy, rollback e incidente                                           |
| [`AGENTS.md`](AGENTS.md)                         | Regras invioláveis do projeto (dinheiro, vocabulário, paleta, estados) |

## Planejamento vigente

O [ADR 019](docs/adrs/019-current-product-backend-alignment.md) substitui o plano limitado a cinco semanas de paridade. Os [43 corpos de issues futuras](docs/backlog/README.md) registram contratos, dependências e aceite; #49–59 cobrem lacunas de escopo. A [auditoria](docs/audits/backend-2026-09-29.md) e a [matriz de contratos](docs/API-CONTRACTS.md) distinguem main, PR aberto e trabalho planejado. #8 pode avançar em infraestrutura; identidade #49 e parcelas bloqueantes de #50 precedem suas consumidoras.

## Convenções

- Todo PR fecha uma issue deste repo e referencia o ADR relevante ("Implements ADR-XXX").
- Decisões novas viram ADR antes do código (`docs/adrs/`): criar → revisar → aceitar → implementar → suplantar.
- Nenhuma lógica financeira no cliente: número calculado no frontend é bug (ver `AGENTS.md`).

## Qualidade e hospedagem

A #8 acrescenta cobertura por arquivo, budget de JavaScript e medição Lighthouse à CI permanente. Relatórios ficam nos artifacts; build público e nginx/CSP são guardados juntos por SHA. Não há deploy automático. Plataforma Fase 1, limites da medição e impedimento administrativo de proteção de branch estão em [ADR008](docs/adrs/008-ci-cd-deploy.md) e [validação](docs/ci-budgets-validation.md).
