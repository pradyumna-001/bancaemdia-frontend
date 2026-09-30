# ADR 003: Cliente, contrato publicado e sessão

## Status

Revisado pela #49 em 30/09/2026, conforme ADR019. Contrato de identidade implementado no backend [PR #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, ainda aberto. Decisão de transporte baseada nessa implementação; adoção no aplicativo em #9/#11/#12 depende da versão integrada e do ambiente. [Contrato e evidências](../contracts/identidade.md).

## Decision

- Tipos gerados exclusivamente do OpenAPI de versão integrada pinada. Default atual `bd055417459f796fed960b5b37efb33a9744419f` permanece compatível com main; PR aberto não é contrato publicado. Drift é comparado à referência escolhida, cuja atualização é revisada.
- #9 fixa commit/SHA-256 em `config/api-contract.json`, gerando tipos e políticas de uploads/idempotência do mesmo documento. CI exige drift zero nos dois arquivos; referência flutuante/URL alternativa/bytes divergentes não atualizam tipos. Cliente lazy único, deadlines incluem corpo finito, erros nunca retêm payload/URL/trace e não há retry/refresh automático no transporte. Ver [implementação e atualização](../contracts/cliente-api.md).
- Cliente único openapi-fetch, base config validada, `credentials: include`, AbortSignal, timeouts GET10s/POST15s/upload60s. O browser não injeta Authorization: os tokens ficam no servidor. Mutações autenticadas por cookie levam `X-CSRF-Token` da sessão atual, incluindo refresh/logout. Erros normalizados sem JSON/stack cru. Downloads tratados como binários quando contratados.
- API é cliente OIDC e servidor de sessão. Cadastro, confirmação de e-mail, senha e recuperação são operados pelo emissor hospedado. Code + PKCE S256/state/nonce são tratados pelo backend. `(iss, sub)` externo confirmado é provisionado numa transação idempotente para um usuário interno numérico existente/ativo; coincidência de e-mail não vincula contas. JWT interno RS256 reutiliza o validador e adiciona sessão/geração revogáveis.
- Browser recebe cookie opaco HttpOnly/Secure/SameSite=Lax, sem Domain. ID/access/refresh tokens e chaves ficam no servidor; identidade, versão e CSRF ficam somente em memória. Login navega para `/auth/start`; callback é `/auth/callback` da API; consulta/renovação/logout usam as rotas reais do [contrato](../contracts/identidade.md). Nenhum SDK do emissor, segredo ou `VITE_AUTH_*` é necessário no SPA.
- Produção usa mesma origem HTTPS: proxy encaminha **`/auth/*` e `/api/*`** ao backend. CSP `connect-src 'self'` permanece suficiente; configuração pública não amplia CSP. Emissor é acessado por navegação hospedada. Origens/callback reais e provedor de produção permanecem pendências administrativas/operacionais explícitas.
- Refresh é explícito, único entre abas, com consulta de sessão dentro da trava antes de decidir renovar. Cookie/CSRF/versão rotacionam juntos; reuso revoga a família. 401 `access_expired` permite uma renovação se a sessão ainda estiver viva; demais 401 encerram contexto. 503 preserva sessão e exige tentativa limitada. Logout só é confirmado após resposta válida; revogação local é imediata, externa usa outbox. Cookie SSO do emissor não é removido por promessa local.
- Sessão não implica permissão comercial. 401 reautentica; 402 account_read_only preserva consulta/exportação e oferece Assinatura. Capacidade vem do servidor; não depende só do verbo HTTP.
- Idempotency-Key por intenção quando exigido (ex.: Caixa, Checkout, troca); não aplicar retry automático genérico a mutações. Timeout pode deixar resultado desconhecido, exigindo reconciliação.
- Paginação conforme endpoint, atualmente page/page_size nas listas principais; Mostrar mais pode acumular páginas sem inventar cursor.
- Job 202 usa status/progresso reais. Cancelar polling não cancela processamento. Autorização/recusa de gasto depende de contrato ainda ausente (#50), antes de executar fluxo que exige consentimento.

## Consequences

Mocks testam apresentação, não completam identidade ou API ausente. Troca de usuário/logout cancela requests/polling/refresh/retries, limpa QueryClient (queries e mutations), formulários privados, arquivos/URLs de mídia e exports. Cada request captura um contexto de sessão e sua versão; respostas anteriores são descartadas mesmo se o aborto chegar tarde. Cache privado não é persistido nem compartilhado entre usuários. #11 implementa isso no aplicativo; o build atual continua sem sessão real. Nenhum cálculo financeiro do domínio migra para o cliente para cobrir lacuna.

O OpenAPI de produção permanece pinado na main integrada. O sandbox de contrato usa **uma única versão completa** do PR #168, isolada dos tipos/build públicos; não é união de schemas. Provas com Keycloak real validam o protocolo implementado, não homologam um tenant Cognito/Auth0 nem demonstram deploy. A #49 conserva o gate de publicação até revisão/merge, aprovação/configuração do emissor e ambiente conjunto.
