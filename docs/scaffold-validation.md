# Validação da issue #1 — 2026-09-29

Base: `origin/main` em `d1d0bb901fbb0a235791fe8e7315987f5b8ab7c0`. Branch: `feat/1-repository-scaffold-tooling`, em worktree isolado. A issue estava aberta e não havia branch/PR anterior da #1. O checkout original foi preservado; nenhum código da API, extensão ou monólito foi alterado.

## Ambiente e reprodução

Windows x64, PowerShell, Node 22.22.0, pnpm 10.34.6, GNU Make 4.4.1 e pre-commit 4.6.2. O runtime inicialmente disponível era Node 24.19.0 / pnpm 11.25.0; a validação final usa as versões acima, disponibilizadas em diretório temporário, sem instalação global.

Para reproduzir no PowerShell com essas ferramentas no PATH:

```powershell
node --version
pnpm --version
make --version
make install
make lint
make typecheck
make test
make build
pnpm exec playwright install
make test:e2e
make gen-types
python -m pre_commit run --all-files
```

Node foi obtido da distribuição oficial `node-v22.22.0-win-x64.zip`; pnpm, do pacote npm `pnpm@10.34.6`; Make, do pacote Chocolatey `make/4.4.1`; pre-commit foi instalado em um venv Python 3.12 temporário. Também foi feita instalação frozen em cópia exportada do índice Git, inicialmente sem `node_modules`, reutilizando apenas o cache de pacotes. Nessa exportação `HUSKY=0` evita instalar hooks porque não existe `.git`; Husky e os hooks são verificados separadamente no worktree real.

## Base anterior

- `pnpm install --frozen-lockfile`: `ERR_PNPM_NO_PKG_MANIFEST`.
- `make -k install lint typecheck test build test:e2e gen-types`: nenhum alvo existe, pois não há Makefile.
- Pre-commit: whitespace no template de PR, EOF ausente em `LICENSE`, CRLF no checkout Windows; formato/typecheck falham por ausência de manifesto. As correções desta issue mantêm o texto da licença proprietária e aplicam somente formatação mecânica nos documentos históricos, exceto a adição explícita ao ADR 014 e o README.
- Sem workflow em `.github/workflows`; não há CI verde anterior ou posterior para declarar.

## Resultados

| Verificação                                          | Resultado real                                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `make install`                                       | Passou com lockfile frozen, inclusive em cópia sem dependências instaladas                                                              |
| `pnpm format` / `pnpm format:check` / `make lint`    | Passaram; zero warnings de ESLint                                                                                                       |
| `make typecheck`                                     | Passou, incluindo aplicação, testes e configurações TypeScript                                                                          |
| `make test`                                          | Passou: 1 teste de componente, abertura e fechamento de informações por interação                                                       |
| `make build`                                         | Passou; `dist/index.html` e JS de 143,98 kB (46,27 kB gzip)                                                                             |
| `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` | Iniciou sem `.env`/API/credenciais; HTTP 200                                                                                            |
| Preview de produção                                  | Iniciou automaticamente pelo Playwright; quatro cenários executaram sobre o build                                                       |
| `make test:e2e`                                      | **Falhou no ambiente: 4 passaram, 2 falharam ao iniciar Firefox**, antes da navegação                                                   |
| Chromium / WebKit, 390×844 e 1440×900                | Passaram teclado, visibilidade, axe, ausência de erros JS e ausência de overflow; screenshots de ambos os tamanhos também inspecionados |
| `make gen-types`                                     | Passou com URL oficial fixada; repetir a geração mantém o hash do arquivo                                                               |
| `pnpm gen-types <snapshot local real>`               | Passou e produziu saída idêntica à URL oficial                                                                                          |
| Fonte OpenAPI inexistente                            | Retornou erro; arquivo de tipos anterior permaneceu intacto                                                                             |
| `python -m pre_commit run --all-files`               | Passou após as correções de EOF/LF; todos os sete hooks executaram                                                                      |
| `docker build -t bancaemdia-frontend:issue-1 .`      | **Bloqueado**: executável Docker ausente                                                                                                |
| `make up API_DIR=<checkout da API>`                  | **Bloqueado** no primeiro comando Compose pela ausência de Docker                                                                       |
| Execução da imagem / UID / fallback / headers nginx  | **Não verificada em runtime**; depende de Docker Linux disponível                                                                       |

## Bloqueios concretos restantes

### Firefox no Windows

Playwright 1.63.0 baixa Firefox 155.0, revisão 1543. Os projetos `firefox-mobile` e `firefox-desktop` falham com `browserType.launch: spawn UNKNOWN`. Executar `firefox.exe --version` diretamente também falha. O log Application/SideBySide do Windows identifica o assembly `mozglue, version=1.0.0.0` não localizado. `playwright install firefox --force` não resolveu. Uma versão anterior (Playwright 1.61.1 / Firefox 151.0, revisão 1532) apresentou a mesma falha de inicialização; a dependência final permanece fixada em 1.63.0.

Não foi removido navegador, assertion ou cenário, nem aplicado patch ao executável. A base anterior não tem e2e para comparação; a reprodução direta do executável isola a falha do código da aplicação. Para concluir, executar a matriz em host compatível, por exemplo Linux com `pnpm exec playwright install --with-deps`, ou corrigir o ambiente Firefox do Windows. Evidências locais são geradas em `playwright-report/` e `test-results/` (ignorados pelo Git).

### Docker

`docker` não é encontrado e `wsl --list --verbose` informa que WSL não está instalado. Não foi instalado hipervisor nem alterado o sistema operacional. As tags `node:22.22.0-alpine` e `nginxinc/nginx-unprivileged:1.28.2-alpine` foram confirmadas na API do registro Docker (HTTP 200), mas isso não comprova build ou execução. O Dockerfile declara `USER 101:101`; a confirmação do processo sem root e do serviço HTTP permanece pendente. Os comandos completos estão no README.

Uma tentativa adicional de verificar nginx nativo foi rejeitada pela revisão automática de execução (`blocked by policy`), sem justificativa mais específica. Essa checagem não foi executada e não substitui a validação Docker.

## Auditoria de escopo

Todos os scripts e alvos pedidos têm comandos reais. Dependências runtime/dev da issue estão presentes; Playwright, axe e os peers de Testing Library/ESLint completam as ferramentas necessárias. TypeScript strict, lockfile, hook, OpenAPI real, Dockerfile multi-stage, Compose, variáveis públicas e licença estão contemplados. `README.md` documenta uso, fontes e decisões; ADR 014 registra a estrutura.

Não há implementação funcional das issues #2–#8, workflow de CI, plataforma de deploy, rota de autenticação, design tokens ou cálculos financeiros. Revisão/merge e as duas validações de ambiente acima permanecem pendentes. A existência do scaffold não significa aceitação integral verde enquanto esses bloqueios não forem resolvidos.
