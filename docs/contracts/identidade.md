# Identidade — contrato verificável da #49

Referência examinada: backend [#167](https://github.com/pradyumna-001/bancaemdia-api/issues/167), [PR #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, base `main` em `bd055417459f796fed960b5b37efb33a9744419f`. PR aberto, fora de rascunho; não integrado/publicado. Frontend parte da #8 em `fc92c89ffc0a81f7a9050b29a0fea5225fc98809`. Decisão: [ADR003](../adrs/003-api-client-typing-session.md).

## Fontes e disponibilidade

- [Contrato backend](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/docs/contracts/identity-session.md), [ADR025](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/docs/adrs/025-oidc-identity-server-sessions.md), [runbook](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/docs/runbooks/identity-session.md).
- [OpenAPI completo](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/tests/contract/schemas/openapi.json) e [handlers](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/src/bancaemdia/api/identity.py). Não promover esse snapshot a `src/api/schema.d.ts` antes de adotar uma versão integrada.
- [Serviço de identidade](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/src/bancaemdia/auth/identity_service.py), [OIDC](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/src/bancaemdia/auth/oidc.py), [transporte](https://github.com/pradyumna-001/bancaemdia-api/blob/ad7cd9fb095ee6b1b9855504a42e23d25341dee2/src/bancaemdia/auth/transport.py).

A main atual continua apenas com Bearer externo fornecido por um emissor não implementado. A feature nova está desabilitada por padrão; `/auth/*` de sessão retorna 503 sem configuração completa. O frontend público continua com guard provisório sem sessão. #49 define e verifica o contrato; #11 integra sessão/cache, #12 conecta as telas ao fluxo hospedado, #9 integra o cliente. Nenhuma tela completa é entregue aqui.

Valores concretos do sandbox pinado (não são ambientes publicados): `OIDC_ISSUER=http://127.0.0.1:58080/realms/bancaemdia-acceptance`, client/audience externo `bancaemdia-acceptance`, JWKS via discovery em `/protocol/openid-connect/certs`; API `http://127.0.0.1:58000`, frontend `http://127.0.0.1:58001`, callback `http://127.0.0.1:58000/auth/callback`. JWT interno usa issuer/audience `bancaemdia-api` nos jobs; acesso de 30s acelera a prova de expiração. Esses valores só existem enquanto o sandbox roda.

## Identidade, provisionamento e autorização

O emissor OIDC opera cadastro, confirmação de e-mail, login e recuperação de senha. Backend opera Code + PKCE S256, state ligado ao cookie do navegador e nonce, troca de código, provisionamento, sessão, refresh e revogação. Fluxo dura dez minutos, é consumido uma vez e não pode ser repetido após falha do callback.

ID token externo: RS256, `iss` igual a `OIDC_ISSUER`, `aud` igual a `OIDC_CLIENT_ID`, `exp`, `iat`, `sub`, `azp` quando aplicável, nonce do fluxo e `email_verified=true`. Discovery/JWKS vêm do emissor configurado. O `sub` externo é opaco; nunca é convertido em ID financeiro pelo browser.

Provisionamento usa vínculo único `(issuer, subject)` → `usuario_id`, trava transacional e constraints PostgreSQL. Repetição/concorrência do mesmo par retorna o mesmo usuário. E-mail coincidente recebe 409 `identity_conflict`: não há auto-link nem recuperação administrativa de posse nesta entrega. Usuário inativo recebe 401, sem reativação. Falha antes da confirmação de e-mail não cria usuário. Identidade confirmada ainda não vinculada é provisionada no callback; usuário ausente com token legado é rejeitado pela main.

JWT interno: RS256, `sub` decimal positivo do usuário interno até BIGINT máximo, `iss=JWT_ISSUER`, `aud=JWT_AUDIENCE`, `exp`, `iat`, `sid` e `ver`. Assinatura e claims reutilizam o validador existente; ledger exige sessão ativa/geração atual/usuário ativo. `/auth/jwks` publica somente a chave RSA pública. ID token e refresh externo, JWT interno e fluxo ficam criptografados no servidor; cookie opaco de 256 bits tem somente hash no índice.

Cadastro não concede assinatura/trial. A entrega backend #168 não integra billing. 401 autentica; 402 `account_read_only`, quando contratado na expansão, preserva sessão, leitura e exportação permitidas. Não inferir capacidade pelo verbo HTTP e não repetir uma mutação automaticamente após pagamento.

## Operações reais para #9/#11/#12

| Operação                                                      | Transporte                                          | Resultado                                                                |
| ------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| GET `/auth/start?return_to=...&intent=login\|signup\|recover` | Navegação de página, destino interno validado       | 302 ao emissor, cookie de fluxo HttpOnly                                 |
| GET `/auth/callback`                                          | Code/state + cookie de fluxo, operado pelo servidor | 302 ao destino salvo; cria cookie de sessão                              |
| GET `/auth/session`                                           | `credentials: include`, sem Authorization           | Identidade, `session_version`, `csrf_token`, prazos e `refresh_required` |
| POST `/auth/refresh`                                          | Cookie + Origin exata + `X-CSRF-Token` atual        | Grant real; cookie, versão e CSRF novos                                  |
| POST `/auth/logout?all_sessions=true` opcional                | Cookie + Origin exata + CSRF atual                  | `logged_out=true` após revogação persistida; cookie removido             |
| GET `/auth/jwks`                                              | Público                                             | RSA pública de assinatura interna                                        |

`SessionStatus` é definido pelo OpenAPI: `usuario_id`, `nome`, `email`, `session_version` (`UUID:geração`), `csrf_token`, `access_expires_at`, `session_expires_at`, `refresh_required`. Datas são RFC3339. Tokens nunca são parte da resposta. IDs não devem ser calculados ou usados como autorização local; #9 deve respeitar os tipos da versão adotada.

Cookie produtivo: `__Host-bancaemdia_session`, HttpOnly, Secure, SameSite=Lax, Path=/, sem Domain. Sandbox loopback usa `bancaemdia_session` sem Secure; não copiar essa exceção para HTTPS publicado. Nada de access/refresh/ID token, cookie legível, senha ou CSRF em localStorage/sessionStorage/config.json/VITE_/logs/artefatos.

## Renovação, recuperação e encerramento

Acesso dura 300s por padrão; sessão, sete dias; inatividade desde renovação, 12h. Valores efetivos vêm do servidor. GET session ainda retorna 200/`refresh_required=true` após expirar o acesso se a sessão estiver viva. Refresh é POST explícito, nunca um loop baseado somente no relógio local.

#11 deve coordenar um único refresh entre abas. Dentro de trava exclusiva, consultar session novamente e usar CSRF/versão atuais antes de renovar; outra aba pode já ter renovado. Web Locks/BroadcastChannel podem coordenar sem transmitir segredo ou identidade. Sem coordenação confiável, não emitir refresh concorrente: oferecer reentrada. Reuso de cookie retirado revoga a família. Substituir todos os dados de sessão a partir da resposta; repetir no máximo uma leitura ainda pertencente ao usuário correto. Escrita não ganha retry automático.

Falha do emissor preserva sessão, com 503 e tentativa limitada. Após grant externo rotacionado e falha de JWKS, backend retém resposta criptografada pendente para retry; browser não reapresenta refresh externo. Callback consumido com falha exige novo login. Acesso interno anterior segue seus próprios limites de ledger/expiração.

Recuperação usa o link real do emissor iniciado por `intent=recover`. Após autenticação confirmada, revoga as sessões locais anteriores sem mudar o usuário. Reset iniciado diretamente no emissor fora desse fluxo não notifica automaticamente a API: essa limitação precisa aparecer no suporte/guia da #12. Logout revoga a capacidade local imediatamente, inclusive JWT emitido, e agenda revogação externa durável. Não promete apagar o cookie SSO do emissor; início usa `prompt=login`.

Ao trocar/encerrar contexto, #11 deve: invalidar contexto antes de novos pedidos; abortar fetch/polling/refresh/retries; cancelar queries; limpar queries **e mutations**, formulários/seleções privadas, arquivos e URLs de mídia/exportação; retirar listeners/callbacks antigos. Cada request captura o contexto/versão; resposta antiga é descartada mesmo que chegue depois do aborto. Versão de refresh muda sem trocar identidade; repetir apenas pedidos ainda válidos para esse contexto. Logout falho não é apresentado como revogação confirmada. Nenhum cache privado em Service Worker, storage persistente ou CDN.

## Estados e mensagens em português

| Estado/código                                                 | Tratamento esperado                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 400 `invalid_destination`, `invalid_flow`                     | “Não foi possível concluir a entrada. Comece novamente.”                                                              |
| 401 sem sessão/expirada/revogada/inativa/identidade rejeitada | Limpar contexto privado; “Entre novamente para continuar.” Inativo tem caminho de suporte.                            |
| 401 `access_expired`                                          | Consultar sessão e coordenar uma renovação, se ainda viva; sem laço                                                   |
| 401 `refresh_reused`                                          | Encerrar família; solicitar nova entrada                                                                              |
| 403 `email_unconfirmed`                                       | “Confirme seu e-mail para continuar.” Caminho hospedado                                                               |
| 403 `csrf_failed`, `origin_not_allowed`                       | Erro de integração/prova; não tratar como assinatura nem repetir escrita                                              |
| 409 `identity_conflict`                                       | “Não foi possível vincular este acesso. Procure suporte.” Sem auto-link/enumeração de cadastro                        |
| 429 rate limit                                                | Esperar `Retry-After`; “Muitas tentativas. Aguarde para tentar novamente.”                                            |
| 503 emissor/JWKS/banco/configuração/refresh indisponível      | Preservar contexto quando válido; “O acesso está temporariamente indisponível. Tente novamente.” Tentativas limitadas |
| 402 `account_read_only`                                       | Manter sessão e dados consultáveis; explicar restrição comercial e caminho Assinatura                                 |

Em `/auth/*`, falhas usam `AuthFailure` (`detail`, `code`); algumas 503 aceitam `ErrorResponse`. Nas rotas financeiras existentes, `ErrorResponse.detail` permanece e o código de autenticação vem de `X-Auth-Error`. CORS expõe esse header, Retry-After e request-id. Não apresentar inglês cru, JSON ou stack. 422 segue OpenAPI, sem refletir entradas sensíveis.

## Origens, callback e CSP

Publicação preferida: uma origem HTTPS exata, Caddy encaminha **`/auth/*` e `/api/*`** à API, demais caminhos ao nginx. `/auth/callback` nunca pode cair no fallback HTML da SPA. `VITE_API_URL` é a origem, sem `/api/v1`. CSP atual permanece `connect-src 'self'`, fontes próprias, scripts próprios + hash exato do tema; navegação hospedada não exige scripts do emissor ou wildcard.

Backend exige mesma hostname para cookie Lax. CORS credenciado permite somente `AUTH_PUBLIC_URL`/`AUTH_FRONTEND_ORIGIN`; sem `*`. Mutações por cookie exigem Origin exata e CSRF, inclusive refresh/logout. Fora de loopback, HTTPS/Secure. Origens produtivas, issuer/client/JWKS reais e callback exato `${AUTH_PUBLIC_URL}/auth/callback` ainda dependem do administrador/operador. Nenhum domínio fictício foi configurado.

Aplicar `destinoInterno` antes de construir `return_to`; preservar query de filtros sem incluir segredo. Backend recusa fragmento `#`, `/auth/`, URL externa, controles e barra invertida. O destino atual do SPA preserva hash; #11 precisa separar fragmento do caminho/query enviado e restaurá-lo apenas no destino já validado, por estado transitório não secreto da aba. Não enviar o resultado completo de `destinoInterno` cegamente ao backend. Remover parâmetros transitórios de protocolo; API opera state/nonce/PKCE/CSRF, não o SPA.

## Evidência e pendências

[CI backend no SHA examinado](https://github.com/pradyumna-001/bancaemdia-api/actions/runs/36656838463): identidade real, **9 aprovados/zero skips**, incluindo cadastro/SMTP, confirmação, provisionamento repetido/concorrente, dois usuários/RLS, expiração, refresh, recuperação, logout sobre JWT emitido, e-mail não confirmado, inativo e falha/recuperação do emissor/JWKS. Demais checks aplicáveis verdes; staging k6 não executado por falta de ambiente, sem dispensa da jornada de identidade.

Prova adicional do frontend e comandos: [validação](../identity-validation.md). O sandbox usa uma versão completa pinada do backend, Keycloak 26.7.4, Mailpit, PostgreSQL e build público/CSP da SPA; ferramentas de teste ficam fora do bundle. Ele não implementa ProvedorAuth/telas da #11/#12 nem certifica o emissor produtivo.

| Gate                                                                             | Estado/responsável                                                                     |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Contrato implementado e prova descartável                                        | Backend #168 + CI de contrato frontend                                                 |
| Integração/revisão/merge da API                                                  | Mantenedor; PR #168 aberto, main não contém entrega                                    |
| Emissor produtivo/plano/região/tenant, cliente, confirmação/SMTP/recovery        | Administrador; recomendação Cognito no ADR backend, sem decisão adotada ou contratação |
| Origens/callback/TLS, chaves, papel DB limitado, migration, manutenção/revogação | Operador, runbook backend; nenhum deploy executado                                     |
| Sessão e isolamento no aplicativo                                                | #11, com transporte da #9 e telas hospedadas da #12                                    |
| Homologação conjunta no emissor escolhido                                        | #14 e responsáveis anteriores; não comprovada pelo sandbox                             |

Não encerrar a #49 como integração publicada enquanto os gates mantidos no aceite estiverem pendentes. Abrir PR e validar sandbox concluem trabalho verificável desta revisão, não substituem merge/configuração/homologação.
