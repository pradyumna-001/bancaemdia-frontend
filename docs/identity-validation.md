# Validação de identidade — #49, #11, #12 e #52

A prova original verificou o contrato do backend [PR #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, e sua compatibilidade com o build público do frontend. [Contrato e gates restantes](contracts/identidade.md), [ADR003](adrs/003-api-client-typing-session.md). A #49 verificou transporte sem ProvedorAuth; a #11 acrescentou o provedor real e as ações mínimas nas rotas existentes; a #12 implementou as [telas de conta](contracts/conta.md).

## Extensão pela #52 e referência atual

O workflow adota a main backend integrada `b916f54331f14cf47a3800324bd61d8638043c06`, mesma árvore única dos tipos e políticas do cliente. O gate exige **dez cenários SPA** e nove backend, zero failures/errors/skips. A #52 mantém os oito cenários anteriores e acrescenta acesso comercial em ambos os viewports: expiração real do trial no servidor, sessão preservada, leitura/exportação/calculadora, recusa 402 e reconfirmação de período pago descartável sem repetir escrita. Não cobra nem provisiona serviços reais.

O observador exige zero erros de página na SPA e registra somente a contagem de diagnósticos do documento hospedado do emissor; não grava mensagens, stack ou URLs de protocolo. Evidência de sandbox não afirma deploy. As seções seguintes registram a evolução e os limites históricos; o estado vigente está em [sessão](contracts/sessao.md) e [acesso](contracts/acesso.md).

## Extensão pela #12

Na #12, o gate passou a **oito cenários SPA** mais nove backend, zero failures/errors/skips. Mantém os quatro da #11 e acrescenta cadastro/recuperação iniciados pelo aplicativo e confirmação expirada, em mobile/desktop. Confirmação usa SMTP real e provisionamento único; repetir o link não cria nova sessão. Interromper a recuperação preserva o acesso anterior; concluir intent=recover revoga as sessões anteriores sem mudar o usuário interno. Expiração usa lifetime temporário somente no realm descartável, restaurado em finally, sem token adulterado nem relógio congelado. Nenhuma evidência do emissor com credenciais é capturada/publicada. Os números das seções históricas abaixo não substituem o gate atual.

## Extensão da prova pela #11

Na #11, o gate passou a **quatro** cenários SPA, sem failures/errors/skips: contrato cookie/CSRF/RLS e ciclo completo da sessão, cada um em 390×844 e 1440×900, além dos nove aceites backend. O guard agora libera o Painel após identidade real; logout é iniciado por **Confirmar saída** na aplicação, sem helper que substitua o provedor. A prova do ciclo renova entre duas abas com exatamente um grant, troca para o segundo usuário com o cache de Revisão aberto, verifica isolamento da API e sai/entra pelo fluxo hospedado preservando query/fragmento.

Esses testes continuam usando dist/CSP públicos, PostgreSQL/Keycloak/SMTP reais e descartáveis, sem injetar sessão ou guardar credenciais em artifacts. E2E com backend HTTP controlado verificam comportamento e acessibilidade nos três browsers/dois viewports, mas não substituem essa integração. Os números e limites históricos da #49 abaixo pertencem àquela revisão; a implementação atual está em [sessão](contracts/sessao.md). Todos os checks devem aprovar o SHA final da #11 antes da entrega.

## Evidência histórica da #49

Backend ainda tem main `bd055417459f796fed960b5b37efb33a9744419f`. PR #168 está aberto, fora de rascunho, sem merge. [Run no HEAD examinado](https://github.com/pradyumna-001/bancaemdia-api/actions/runs/36656838463): lint, formato, tipos, contratos, testes, segurança, Docker e jornada real verdes. Log do job de identidade: **9 passed, zero skips**; Keycloak/SMTP/Chromium/PostgreSQL reais, sem emissor/token de fixture. Staging k6 é inaplicável sem ambiente e não dispensa essa prova.

Código conferido: claims e nonce em `auth/oidc.py`, provisionamento/locks/revogação em `auth/identity_service.py`, cookie/endpoints em `api/identity.py`, Origin/CSRF/CORS em `auth/transport.py`, tipos publicados no OpenAPI, configuração e papéis no runbook. Conferidos também configuração/guard/destinoInterno/QueryClient/gerador atuais do SPA. Identificado fragmento não aceito pelo backend e proxy `/auth/*`, registrados para consumidoras.

## Prova repetível no frontend

[Workflow de contrato](../.github/workflows/identity-contract.yml) executa push e PR no SHA exato do frontend. Faz checkout de **uma versão completa pinada** do backend para `.identity-api/`; não muda `src/api/schema.d.ts` nem une schemas de PRs. Emite credenciais descartáveis aleatórias/mascaradas, inicia PostgreSQL16, Keycloak26.7.4 e Mailpit1.31.3 em loopback e repete os nove aceites backend, com gate sem skips.

Depois, `tests/identity/test_browser_contract.py` reutiliza os fixtures de processos/emissor, substituindo o servidor mínimo de retorno pelo **dist público e CSP gerada desse mesmo build**. Cada viewport recebe um banco descartável próprio, migrado pelo fixture backend: chaves novas de um harness não devem consumir ciphertext/outbox de outro. A criação/remoção fica restrita ao PostgreSQL de loopback desse Compose. Proxy de teste encaminha `/auth/*` e `/api/*`, mantendo headers/cookies/origem e CSP estrita. Não emite JWT, injeta sessão, mocka respostas ou inclui código de teste no bundle. Apenas `/config.json` público aponta à origem loopback. Não grava HAR, traces, capturas, cookies, provas CSRF, links de confirmação ou senhas em artifacts.

Na revisão original da #49, dois cenários obrigatórios, 390×844 e 1440×900, criaram duas identidades pelo cadastro/confirmação do emissor real; verificaram usuário interno distinto, API autorizada por cookie, isolamento RLS, 403 sem CSRF, refresh real/versionamento, logout e recusa posterior, preservação da outra sessão, armazenamento vazio/HttpOnly/no-store e ausência de violação CSP/erro de página. Naquele momento o guard ainda era provisório: Painel voltava a Entrar mesmo com cookie. A extensão #11 acima substitui essa expectativa pela sessão real.

O gate `tests/identity/check_results.py` exige atualmente exatamente os dez cenários, zero failures/errors/skips. Relatórios JUnit são artifacts separados do artifact público da CI existente. Builds de fixtures e ferramentas Python nunca são publicados.

### Reprodução local em Linux com Docker

1. Checkout limpo de bancaemdia-api no SHA pinado para `.identity-api` (diretório ignorado), Python3.12 e dependências dev daquele backend. Não usar branch flutuante nem banco compartilhado.
2. Node/pnpm da referência do frontend; `make install lint typecheck test:coverage build check:bundle gen-types`. Conferir ausência de drift em `src/api/schema.d.ts`.
3. Gerar/exportar credenciais e DSNs **descartáveis**, seguindo o passo do workflow. Nenhuma credencial real ou serviço pago é necessário. Iniciar Compose e instalar Chromium conforme o workflow.
4. Com cwd `.identity-api`, executar:

```bash
pytest -n 0 tests/identity/journey.py tests/integration/test_identity_db.py --junitxml=identity-results.xml --tb=short -v
python scripts/check_identity_results.py identity-results.xml
python -m pytest -c pyproject.toml -n 0 --import-mode=importlib -p tests.conftest ../tests/identity/test_browser_contract.py --junitxml=browser-contract.xml --tb=short -v
python ../tests/identity/check_results.py browser-contract.xml
```

5. Encerrar somente esse sandbox com seu Compose. Não executar manutenção/migration em banco real para reproduzir testes.

Windows desta sessão: runtime fornecia Node24/pnpm11.25.0; foram usadas as versões de referência **Node22.22.0/pnpm10.34.6**, instaladas fora do checkout, sem alterar lockfile/políticas. Node24 teve incompatibilidade de AbortSignal no jsdom; referência22 passou sem modificar testes. Lint, tipagem, 241 testes e cobertura >=80% por arquivo nas quatro métricas aprovados; build, JS inicial 98.652/200.000 bytes gzip e OpenAPI main sem drift aprovados. Lighthouse13.5.0 mediu mobile/desktop usando Chrome local: performance88/99, acessibilidade100/100, boas práticas96/96, CLS0/0; mobile LCP3921ms não aprova o alvo futuro de release da #37. A medição obrigatória da #8 não é certificação de performance de telas autenticadas.

Docker local não está disponível; provas que exigem containers são obrigatórias na CI Linux, não apresentadas como executadas localmente. CI permanente da #8 continua inteira: cobertura por arquivo, budget, OpenAPI main sem drift, Lighthouse, 120 E2E nos três browsers/dois viewports, pre-commit, Docker/nginx/CSP e GitGuardian, no HEAD final.

## Auditoria histórica do aceite da #49

| Requisito                                      | Evidência / limite                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Emissor/claims/JWKS/sujeito                    | Contrato e código backend pinados; valores de sandbox explícitos, produção ainda não configurada      |
| Provisionamento idempotente e concorrente      | Jornada real + integração PostgreSQL, repetidas na CI desta revisão                                   |
| Conta/confirmar/recuperar/renovar/sair         | Emissor real + backend; recuperação externa fora do fluxo tem limitação documentada                   |
| Token inválido/expirado/inativo/não confirmado | Aceites backend obrigatórios sem skips                                                                |
| Transporte, CSRF e isolamento                  | Prova adicional nos dois viewports com dist/CSP públicos, cookies/requests reais                      |
| Limpeza de cache/respostas antigas             | #11 implementa fences, limpeza e remontagem; ciclo real obrigatório verifica troca com cache aberto   |
| Sessão versus assinatura                       | ADR003/matriz/backlog; billing permanece em PR separado, sem simulação local                          |
| Publicação do contrato                         | **Pendente** revisão/merge backend, emissor aprovado e homologação/deploy conjunto; donos no contrato |

A #49 pode apresentar esta implementação de contrato e prova descartável para revisão; **não está concluída como integração publicada**. Não realizar merge/fechamento enquanto o gate do aceite mantido estiver bloqueado. Frontend #11/#12 podem avançar contra essa referência com limites explícitos; CI verde do sandbox não cria ambiente produtivo.
