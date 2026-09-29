# ADR 003: Cliente, contrato publicado e sessão

## Status

Revisado pelo ADR019 em 29/09/2026. Implementações #9/#11; contrato de identidade #49.

## Decision

- Tipos gerados exclusivamente do OpenAPI de versão integrada pinada. Default atual `bd055417459f796fed960b5b37efb33a9744419f` permanece compatível com main; PR aberto não é contrato publicado. Drift é comparado à referência escolhida, cuja atualização é revisada.
- Cliente único openapi-fetch, base config validada, Authorization via sessão, AbortSignal, timeouts GET10s/POST15s/upload60s. Erros normalizados sem JSON/stack cru. Downloads tratados como binários quando contratados.
- JWT da API exige sujeito numérico e usuário existente/ativo. #49 define emissor, mapeamento/provisionamento e renovação antes de #11/#12. Nenhum login/refresh da API é presumido.
- Token de sessão nunca em localStorage. Transporte em memória com refresh HttpOnly ou fluxo hospedado/PKCE depende do emissor aprovado. Callbacks/CSP/CORS e destinos internos fazem parte desse contrato.
- Sessão não implica permissão comercial. 401 reautentica; 402 account_read_only preserva consulta/exportação e oferece Assinatura. Capacidade vem do servidor; não depende só do verbo HTTP.
- Idempotency-Key por intenção quando exigido (ex.: Caixa, Checkout, troca); não aplicar retry automático genérico a mutações. Timeout pode deixar resultado desconhecido, exigindo reconciliação.
- Paginação conforme endpoint, atualmente page/page_size nas listas principais; Mostrar mais pode acumular páginas sem inventar cursor.
- Job 202 usa status/progresso reais. Cancelar polling não cancela processamento. Autorização/recusa de gasto depende de contrato ainda ausente (#50), antes de executar fluxo que exige consentimento.

## Consequences

Mocks testam apresentação, não completam identidade ou API ausente. Troca de usuário/logout limpa dados privados. Nenhum cálculo financeiro do domínio migra para o cliente para cobrir lacuna.
