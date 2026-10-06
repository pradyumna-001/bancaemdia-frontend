# Homologação — artefato, servidor e prova real

## Disponibilidade em 06/10/2026

**Preparação técnica da #14; ambiente público ainda não disponível.** O frontend não tem ambiente GitHub de deploy configurado. O backend tem um ambiente chamado `staging`, sem variáveis de implantação; esse nome sozinho não comprova um servidor. A [issue backend #41](https://github.com/pradyumna-001/bancaemdia-api/issues/41) registra host, DNS, segredos e armazenamento ainda aguardando ativação pelo administrador/operador.

Dependências de publicação: [infraestrutura #181](https://github.com/pradyumna-001/bancaemdia-api/pull/181), SHA `ff9a0f0e81fe4e3765d0105654d4e98fdfeaf1f4`, que incorpora #146, e [identidade #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ca4fe80e08c0ab7c85df84d207d6d393e44e9161`. Ambos estão abertos nesta conferência; não concatenar suas árvores nem promover schemas de PR como API integrada. A main observada do backend é `8d5aea6bf4c9c99581910a8b1a2ed8c19edc65b8`; o OpenAPI frontend continua no commit pinado de `config/api-contract.json`.

Esta entrega prepara promoção e smoke; não cria instância, DNS, emissor ou credenciais, não ativa AWS/CD do backend e não publica produção. A #14 permanece aberta até URL pública, login real e evidência de homologação. Os ensaios descartáveis de CI não encerram esse aceite.

## Artefato aprovado

`Homologação do frontend` é um `workflow_dispatch` manual na `main`, serializado sem cancelar uma promoção anterior. O operador informa o ID da CI de push do **mesmo SHA da main** que executa o workflow. Os jobs de PR continuam validando seus próprios commits antes de revisão; a promoção usa os checks da main, não sucesso de outro SHA.

O preparador verifica repositório/branch/evento/workflow, conclusão da CI, todos os checks aplicáveis, `Testes (push)`, `Identidade real (push)` e GitGuardian. Somente o próprio check de promoção em andamento é excluído dessa consulta. O artefato é exatamente `frontend-<SHA>-push`, não expirado, com referência de commit e digest. ZIP é verificado pelo SHA-256 antes da extração; travessia de diretórios, links simbólicos e arquivos fora do build público são recusados.

O empacotamento usa `deploy/staging/Dockerfile`, copiando `dist/` e `dist-security/` aprovados, sem `pnpm build`. O guard verifica árvore pública, ausência de fixture/source maps, HTML e hash CSP da mesma compilação e registra fingerprint dos bytes. Acrescenta somente `release.json` operacional; HTML, JS, CSS, fontes e nginx não são reescritos. A imagem GHCR é selecionada por digest, com label do SHA verificado no host. `config.json` é público, separado da imagem e montado somente para leitura.

## Pareamento e origem

API, login e SPA usam a mesma origem HTTPS real: Caddy encaminha `/auth`, `/auth/*`, `/api`, `/api/*`, `/health` e `/ready` para `api:8000`, preservando os prefixos. O restante vai a `frontend-staging:8080`. `/metrics` fica fechado; logs removem headers e URI. O nginx mantém `connect-src 'self'`, hash exato do tema e cache correto. Usar [`handle`](https://caddyserver.com/docs/caddyfile/directives/handle), que preserva o caminho, e não `handle_path` nas rotas de protocolo.

O Compose do frontend é independente, sem porta pública, ligado à rede externa `bancaemdia_edge` já criada pela Fase 1. Só seu serviço é alterado; banco, workers, API e Caddy pertencem à implantação do backend. O template Caddy precisa ser instalado/revisado pelo operador antes de habilitar o workflow, preservando IP de proxy confiável, TLS e configuração de identidade do backend. Não subir um segundo Caddy disputando 80/443.

O operador revisa o vínculo **SHA da API ↔ imagem API por digest**, a partir da publicação escaneada do backend, e configura ambos. O guard exige esse SHA integrado à main e igual ao OpenAPI pinado que já contém identidade. No host, o digest da API em execução precisa coincidir com o pareamento configurado. Isso não adiciona um endpoint de versão ao backend nem presume um label que seu Dockerfile não publica.

## Ambiente GitHub e host — responsabilidade operacional

Criar o ambiente frontend `staging`, restringir deploy à branch `main` e aplicar os revisores definidos pelo administrador antes de armazenar credenciais. [Proteção e secrets de ambiente](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) são controles do GitHub; um teste local não os configura.

Variáveis do ambiente, vazias até existir configuração real aprovada:

| Variável            | Valor exigido                                                         |
| ------------------- | --------------------------------------------------------------------- |
| `STAGING_ENABLED`   | `true` somente após revisão/ativação do ambiente                      |
| `STAGING_ORIGIN`    | Origem HTTPS pública, sem caminho, porta alternativa ou credenciais   |
| `STAGING_API_SHA`   | Commit integrado da API, igual ao OpenAPI frontend adotado            |
| `STAGING_API_IMAGE` | `ghcr.io/pradyumna-001/bancaemdia-api@sha256:<digest revisado>`       |
| `STAGING_ISSUER`    | Issuer OIDC HTTPS exato, já configurado no backend                    |
| `STAGING_SSH_HOST`  | Host aprovado, sem prefixo de URL ou comandos                         |
| `STAGING_SSH_USER`  | Usuário de deploy do host, com acesso ao Docker e ao diretório abaixo |

Secrets exclusivamente de operação, nunca `VITE_`, config público ou artefato:

| Secret                    | Uso                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `STAGING_SSH_PRIVATE_KEY` | Chave do usuário de deploy                                                                                 |
| `STAGING_SSH_KNOWN_HOSTS` | Chave pública do servidor conferida por canal confiável; host checking permanece obrigatório               |
| `STAGING_SESSION_COOKIE`  | Cookie opaco atual de uma conta descartável, obtido **após login hospedado real** na origem de homologação |

O host precisa de Linux, Docker/Compose, Python 3.12+, stack Fase 1 saudável, rede `bancaemdia_edge`, acesso de leitura ao pacote GHCR e `/srv/bancaemdia-frontend/staging` preparado para o usuário de deploy. Credencial de leitura do registry fica no host, conforme runbook do backend. SSH usa porta 22; restrições de rede/IP e tamanho da instância são decisões do operador. Nenhum segredo do backend é copiado para o frontend.

O primeiro login hospedado completo, consentimentos de identidade do emissor quando pertinentes, callback e cookie produtivo precisam ser homologados pelo operador no ambiente real. A conta de smoke deve ser própria para testes, sem dados pessoais/clientes; cookie expira e deve ser atualizado antes de nova execução. O workflow não cria usuário nem contorna o emissor. O segredo é recebido somente pelo processo de smoke, não enviado ao host ou inserido no site.

## Promoção, falha e restauração

1. Preparar ferramentas de smoke antes de trocar o frontend; verificar CI, artefato, identidade integrada e origens.
2. Empacotar o build aprovado e obter digest. Validar acesso SSH sem desabilitar verificação do host.
3. No servidor, conferir API/rede, baixar imagem frontend e validar label. Criar release com imagem, config e Compose imutáveis; registrar transação pendente e referência anterior antes da troca.
4. Subir somente `frontend`, esperar seu healthcheck e executar smoke público com TLS validado. Apenas após sucesso confirmar a transação e atualizar `current.json`/`previous.json`.
5. Falha de pull não altera o serviço anterior. Falha parcial ou smoke inválido restaura a versão/config/Compose anterior; na primeira instalação sem anterior, o candidato é parado. Restauração que falha mantém `pending.json` para recuperação; não declara sucesso.

`host.py` serializa operações com lock e identifica a transação pelo run/attempt. Uma execução não pode restaurar a promoção de outra. Se runner/SSH desaparecer, o registro pendente impede nova promoção até intervenção; verificar serviço e usar `abort <run-attempt>` da transação correta. Isso é recuperação de resultado desconhecido, não prova de rollback já ocorrido.

Rollback manual posterior: `python3 /srv/bancaemdia-frontend/staging/host.py rollback <SHA atualmente instalado>`. Exige release anterior e nenhuma promoção pendente, conserva imagem/config/Compose e recusa se o SHA atual mudou. Executar novamente o smoke com o manifesto anterior e registrar duração; meta de sete minutos continua dependendo do ensaio no host real. Não toca migrations nem dados do backend.

## Evidências e limites

Smoke público: descoberta OIDC real e redirecionamento de início/PKCE/cookie Secure; callback nunca tratado como página SPA; sessão real, consulta autenticada da API, config/versão exatas, CSP/CORS, 404 de assets/métricas, deep link e F5 em **390×844 e 1440×900**. Não escreve finanças. O smoke automatizado reutiliza uma sessão real criada por login hospedado; não substitui a prova inicial desse login completo. Provas de cadastro/recuperação continuam nas #12/#49.

Artefatos guardam somente manifesto público e resultado sanitizado. Cookie, CSRF, protocolo de login, payload privado, screenshots e traces de conta real não entram nos relatórios. Evidência futura: URL real, SHA frontend/API, digests, CI e run de homologação, ambos viewports, login hospedado realizado, rollback/duração e responsável. Sem esses registros, a issue permanece aguardando ambiente.

CI normal preserva todos os gates e acrescenta testes de seleção/extração/transação e um proxy Docker descartável com o Caddyfile entregue, verificando roteamento, logs, CSP, arquivo/config e F5. Esse harness usa resposta sintética identificada, loopback e ambiente `development`: prova a borda, **não** identidade real ou homologação pública. A prova de identidade real já existente permanece obrigatória e separada.

No Windows, os testes stdlib do host podem usar `STAGING_TEST_PYTHON` com o executável Python local; em CI `python3` já existe. Essa variável pertence ao runner de testes, nunca ao bundle.
