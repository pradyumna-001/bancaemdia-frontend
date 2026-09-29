# Validação da issue #1 — 2026-09-29

Todos os comandos de aceitação passaram. As pendências iniciais do Windows foram resolvidas executando a matriz completa em runners Linux descartáveis, sem alterar os testes ou os executáveis dos navegadores.

## Evidências

- [Aceitação completa — execução 36596303352](https://github.com/pradyumna-001/bancaemdia-frontend/actions/runs/36596303352): instalação limpa, lint, formatação, tipos, unit, build, geração OpenAPI, seis e2e, sete hooks pre-commit e imagem Docker. Commit `40b74f4e196764dadab6eed342a59730763d2f9a`.
- [Stack local — execução 36596574664](https://github.com/pradyumna-001/bancaemdia-frontend/actions/runs/36596574664): `make up` com frontend e checkout isolado do backend oficial, seguido de HTTP da API e do SPA e encerramento dos containers. Commit `a45994816b469c025451fa1f11b229c5073acd5a`.
- Os workflows usados nessas execuções foram temporários e removidos após a validação. Seus arquivos e comandos completos permanecem acessíveis nos commits e logs das execuções. O código da aplicação, dependências, Makefile, Dockerfile e nginx não mudou após esses testes; os commits finais apenas removem os workflows temporários e atualizam a documentação.

Base: `origin/main` em `d1d0bb901fbb0a235791fe8e7315987f5b8ab7c0`. Branch: `feat/1-repository-scaffold-tooling`, em worktree isolado. Checkout original e demais repositórios preservados. Nenhum código da API, extensão ou monólito foi alterado.

## Ambiente reproduzível

Aceitação final: Ubuntu 24.04, Node 22.22.0, pnpm 10.34.6, GNU Make, Docker/Compose e navegadores oficiais do Playwright 1.63.0. O runner começou sem dependências do projeto; não foram necessários serviços pagos, tokens de aplicação ou credenciais reais.

```bash
npm install --global pnpm@10.34.6
make install lint typecheck test build gen-types
git diff --exit-code -- src/api/schema.d.ts
pnpm exec playwright install --with-deps
make test:e2e
pipx run pre-commit run --all-files
docker build -t bancaemdia-frontend:issue-1 .
docker compose up -d
```

Para os testes HTTP, UID e headers, veja os comandos executados no primeiro link e o smoke do README. O segundo runner clonou a API no commit `bd055417459f796fed960b5b37efb33a9744419f`, gerou um `.env` descartável com segredos aleatórios locais, endereços PostgreSQL/Redis da rede Compose e `APP_ENV=testing`, e executou `make up API_DIR=<checkout isolado>`. Nenhuma chamada de IA ou login externo foi necessária. Os containers dos dois runners foram encerrados ao final.

Também houve validação local em Windows x64 com PowerShell, Node 22.22.0, pnpm 10.34.6, GNU Make 4.4.1 e pre-commit 4.6.2. As ferramentas foram disponibilizadas em diretório temporário, sem instalação global. A instalação frozen passou em cópia exportada do índice Git inicialmente sem `node_modules`, reutilizando apenas o cache de pacotes. Nessa exportação `HUSKY=0` evita instalar hooks porque não há `.git`; o hook Husky real executou lint-staged e typecheck nos commits do worktree.

## Resultados finais

| Verificação                                          | Resultado                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `make install`                                       | Passou com lockfile frozen em Windows e runner Linux limpo                                                         |
| `pnpm format`, `pnpm format:check`, `make lint`      | Passaram; zero warnings de ESLint                                                                                  |
| `make typecheck`                                     | Passou, incluindo aplicação, testes e configurações TypeScript                                                     |
| `make test`                                          | Passou: 1 teste de componente, abrindo e fechando informações por interação                                        |
| `make build`                                         | Passou; `dist/index.html` e JS de 143,98 kB (46,27 kB gzip)                                                        |
| `pnpm dev --host 127.0.0.1 --port 5173 --strictPort` | HTTP 200 local sem `.env`, API ou credenciais                                                                      |
| `make test:e2e`                                      | **6 passaram**: Chromium, Firefox e WebKit em 390×844 e 1440×900, sobre o build de produção                        |
| Teclado, axe, erros JS e overflow                    | Passaram em todos os seis cenários; screenshots mobile/desktop inspecionados, incluindo Firefox Linux              |
| `make gen-types`                                     | Passou; regeneração da URL oficial mantém o arquivo versionado sem diff                                            |
| Geração com snapshot local real                      | Passou; saída idêntica à URL oficial                                                                               |
| Fonte OpenAPI inexistente                            | Retornou erro e preservou o arquivo de tipos anterior                                                              |
| Pre-commit                                           | Todos os sete hooks passaram, inclusive no Linux                                                                   |
| Husky / lint-staged                                  | Hook real passou nos commits, sem stash ou bypass                                                                  |
| `docker build -t bancaemdia-frontend:issue-1 .`      | Passou                                                                                                             |
| Processo da imagem                                   | `Config.User=101:101`, `id -u=101` e `/proc/1/status` confirmou todos os UIDs como 101                             |
| nginx                                                | `nginx -t` passou; Compose iniciou com filesystem somente leitura e `/tmp` temporário                              |
| HTTP da imagem                                       | Raiz e rota de fallback retornaram o mesmo HTML; asset inexistente retornou 404                                    |
| Headers da imagem                                    | CSP restrita, `nosniff`, index sem cache e assets com cache imutável confirmados por HTTP                          |
| `make up API_DIR=<checkout isolado da API>`          | Passou; PostgreSQL/Redis saudáveis, API e frontend iniciados, `/health`, `/openapi.json` e raiz do SPA responderam |
| Limpeza dos runners                                  | Containers encerrados; nenhum serviço adicional ficou rodando no Windows                                           |
| GitGuardian                                          | Check externo do PR passou; é separado da CI do projeto                                                            |

Os relatórios Playwright e screenshots foram publicados no artefato `issue-1-validation` da primeira execução, com retenção de sete dias. Os logs das execuções registram as assertions e seus resultados.

## Limitações locais diagnosticadas

O Windows original não tem Docker nem WSL instalado. Firefox 155.0/revisão 1543 falha antes de abrir a aplicação com `spawn UNKNOWN`; o log Application/SideBySide aponta o assembly `mozglue` não localizado. O erro também ocorre executando `firefox.exe --version` diretamente, após novo download e com a versão anterior 151.0/revisão 1532.

Essas limitações permanecem locais, mas não bloqueiam mais a aceitação: Docker e os seis e2e foram executados com sucesso no Linux. Não houve patch no Firefox, remoção de navegador/assertion, instalação de hipervisor ou reinicialização do Windows. A tentativa anterior de nginx nativo rejeitada pela revisão automática não foi usada como evidência; a verificação definitiva foi feita na imagem Docker real.

## Base anterior e escopo

- Na base, `pnpm install --frozen-lockfile` falha com `ERR_PNPM_NO_PKG_MANIFEST`; nenhum dos alvos Make existe.
- Os hooks anteriores também falham por ausência do manifesto, whitespace no template de PR, EOF ausente em `LICENSE` e CRLF. A licença proprietária mantém seu texto; documentos históricos receberam apenas formatação, exceto README e a adição explícita ao ADR 014.
- Não havia workflow em `main`. As execuções pontuais acima validam a #1, mas **não introduzem CI permanente**: workflows/gates, budgets e deploy continuam na #8.
- Todos os scripts e alvos pedidos têm comandos reais; dependências, TypeScript strict, lockfile, hooks, OpenAPI real, imagem multi-stage, Compose e documentação estão entregues.
- Não há implementação funcional das issues #2–#8, autenticação, design tokens ou cálculos financeiros. A implementação e a validação da #1 estão concluídas; apenas revisão e merge permanecem pendentes.
