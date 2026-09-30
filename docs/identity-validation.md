# Validação de identidade — #49

Esta revisão verifica o contrato do backend [PR #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, e sua compatibilidade com o build público do frontend. [Contrato e gates restantes](contracts/identidade.md), [ADR003](adrs/003-api-client-typing-session.md). Não há alteração visual nem implementação de ProvedorAuth/telas completas; #11/#12 permanecem próprias.

## Evidência existente revalidada

Backend ainda tem main `bd055417459f796fed960b5b37efb33a9744419f`. PR #168 está aberto, fora de rascunho, sem merge. [Run no HEAD examinado](https://github.com/pradyumna-001/bancaemdia-api/actions/runs/36656838463): lint, formato, tipos, contratos, testes, segurança, Docker e jornada real verdes. Log do job de identidade: **9 passed, zero skips**; Keycloak/SMTP/Chromium/PostgreSQL reais, sem emissor/token de fixture. Staging k6 é inaplicável sem ambiente e não dispensa essa prova.

Código conferido: claims e nonce em `auth/oidc.py`, provisionamento/locks/revogação em `auth/identity_service.py`, cookie/endpoints em `api/identity.py`, Origin/CSRF/CORS em `auth/transport.py`, tipos publicados no OpenAPI, configuração e papéis no runbook. Conferidos também configuração/guard/destinoInterno/QueryClient/gerador atuais do SPA. Identificado fragmento não aceito pelo backend e proxy `/auth/*`, registrados para consumidoras.

## Prova repetível no frontend

[Workflow de contrato](../.github/workflows/identity-contract.yml) executa push e PR no SHA exato do frontend. Faz checkout de **uma versão completa pinada** do backend para `.identity-api/`; não muda `src/api/schema.d.ts` nem une schemas de PRs. Emite credenciais descartáveis aleatórias/mascaradas, inicia PostgreSQL16, Keycloak26.7.4 e Mailpit1.31.3 em loopback e repete os nove aceites backend, com gate sem skips.

Depois, `tests/identity/test_browser_contract.py` reutiliza os fixtures de processos/banco/emissor, substituindo apenas o servidor mínimo de retorno pelo **dist público e CSP gerada desse mesmo build**. Proxy de teste encaminha `/auth/*` e `/api/*`, mantendo headers/cookies/origem e CSP estrita. Não emite JWT, injeta sessão, mocka respostas ou inclui código de teste no bundle. Apenas `/config.json` público aponta à origem loopback. Não grava HAR, traces, capturas, cookies, provas CSRF, links de confirmação ou senhas em artifacts.

Dois cenários obrigatórios, 390×844 e 1440×900, criam duas identidades pelo cadastro/confirmação do emissor real; verificam usuário interno distinto, API autorizada por cookie, isolamento RLS, 403 sem CSRF, refresh real/versionamento, logout e recusa posterior, preservação da outra sessão, armazenamento vazio/HttpOnly/no-store e ausência de violação CSP/erro de página. O guard público continua provisório: mesmo com cookie real o Painel ainda volta a Entrar. Isso comprova **compatibilidade do transporte/proxy/contrato**, não implementação de sessão/cache/UI da #11.

O gate `tests/identity/check_results.py` exige exatamente os dois cenários, zero failures/errors/skips. Relatórios JUnit são artifacts separados do artifact público da CI existente. `dist-shell-fixture` e ferramentas Python nunca são publicados.

### Reprodução local em Linux com Docker

1. Checkout limpo de bancaemdia-api no SHA pinado para `.identity-api` (diretório ignorado), Python3.12 e dependências dev daquele backend. Não usar branch flutuante nem banco compartilhado.
2. Node/pnpm da referência do frontend; `make install lint typecheck test:coverage build check:bundle gen-types`. Conferir ausência de drift em `src/api/schema.d.ts`.
3. Gerar/exportar credenciais e DSNs **descartáveis**, seguindo o passo do workflow. Nenhuma credencial real ou serviço pago é necessário. Iniciar Compose e instalar Chromium conforme o workflow.
4. Com cwd `.identity-api`, executar:

```bash
pytest -n 0 tests/identity/journey.py tests/integration/test_identity_db.py --junitxml=identity-results.xml --tb=short -v
python scripts/check_identity_results.py identity-results.xml
python -m pytest -n 0 --import-mode=importlib -p tests.conftest ../tests/identity/test_browser_contract.py --junitxml=browser-contract.xml --tb=short -v
python ../tests/identity/check_results.py browser-contract.xml
```

5. Encerrar somente esse sandbox com seu Compose. Não executar manutenção/migration em banco real para reproduzir testes.

Windows desta sessão: runtime fornecia Node24/pnpm11.25.0; foram usadas as versões de referência **Node22.22.0/pnpm10.34.6**, instaladas fora do checkout, sem alterar lockfile/políticas. Node24 teve incompatibilidade de AbortSignal no jsdom; referência22 passou sem modificar testes. Lint, tipagem, 241 testes e cobertura >=80% por arquivo nas quatro métricas aprovados; build, JS inicial 98.652/200.000 bytes gzip e OpenAPI main sem drift aprovados. Lighthouse13.5.0 mediu mobile/desktop usando Chrome local: performance88/99, acessibilidade100/100, boas práticas96/96, CLS0/0; mobile LCP3921ms não aprova o alvo futuro de release da #37. A medição obrigatória da #8 não é certificação de performance de telas autenticadas.

Docker local não está disponível; provas que exigem containers são obrigatórias na CI Linux, não apresentadas como executadas localmente. CI permanente da #8 continua inteira: cobertura por arquivo, budget, OpenAPI main sem drift, Lighthouse, 120 E2E nos três browsers/dois viewports, pre-commit, Docker/nginx/CSP e GitGuardian, no HEAD final.

## Auditoria do aceite

| Requisito                                      | Evidência / limite                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Emissor/claims/JWKS/sujeito                    | Contrato e código backend pinados; valores de sandbox explícitos, produção ainda não configurada      |
| Provisionamento idempotente e concorrente      | Jornada real + integração PostgreSQL, repetidas na CI desta revisão                                   |
| Conta/confirmar/recuperar/renovar/sair         | Emissor real + backend; recuperação externa fora do fluxo tem limitação documentada                   |
| Token inválido/expirado/inativo/não confirmado | Aceites backend obrigatórios sem skips                                                                |
| Transporte, CSRF e isolamento                  | Prova adicional nos dois viewports com dist/CSP públicos, cookies/requests reais                      |
| Limpeza de cache/respostas antigas             | Especificada para #11; não implementada ou aprovada por fixture como comportamento do app             |
| Sessão versus assinatura                       | ADR003/matriz/backlog; billing permanece em PR separado, sem simulação local                          |
| Publicação do contrato                         | **Pendente** revisão/merge backend, emissor aprovado e homologação/deploy conjunto; donos no contrato |

A #49 pode apresentar esta implementação de contrato e prova descartável para revisão; **não está concluída como integração publicada**. Não realizar merge/fechamento enquanto o gate do aceite mantido estiver bloqueado. Frontend #11/#12 podem avançar contra essa referência com limites explícitos; CI verde do sandbox não cria ambiente produtivo.
