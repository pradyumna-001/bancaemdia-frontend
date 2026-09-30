# Sessão no aplicativo — #11

ProvedorAuth consulta a identidade real, protege as rotas existentes e conecta o contador de Revisão ao GET tipado. Entrar navega para o emissor via `/auth/start`; Confirmar saída chama o logout da API. São ações mínimas nas páginas já existentes: as telas completas de conta são #12. Sessão válida não concede assinatura ou FULL_WRITE; 402 preserva identidade, sem repetir escrita.

Referência de identidade: backend [PR #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, [contrato](identidade.md), [ADR003](../adrs/003-api-client-typing-session.md). Continua aberto, sem deploy. OpenAPI de domínio permanece na main integrada `bd055417459f796fed960b5b37efb33a9744419f`, com SHA-256 em `config/api-contract.json`; nenhum schema de PR foi promovido ou concatenado.

## Fronteira e estado

`protocol.ts` recebe `unknown`, valida campos de controle e produz `SessionContext` interno. Não declara a resposta `SessionStatus` manualmente. Esse contexto contém identidade, versão, prova e sinal de renovação somente em memória; React recebe apenas pessoa, fase, erro seguro e geração privada. Antes de publicar, integrar #168, adotar seu OpenAPI completo e migrar o transporte para operações geradas, preservando a validação de fronteira.

Todos os pedidos usam cookie, `credentials: include`, sem Authorization, cache no-store e deadline incluindo corpo. Prova CSRF acompanha somente POST autenticado. Cookie é HttpOnly/Secure em HTTPS; a exceção HTTP é exclusiva do sandbox de loopback. URL, payload, provas e tokens não entram em erros, logs ou artifacts. Fases: conferindo, anônimo, autenticado, encerrando e erro recuperável.

`destinoInterno` valida caminho/query/fragmento pelo catálogo. A API recebe somente caminho/query. Um registro não secreto em sessionStorage guarda o fragmento por até dez minutos, consumido uma vez ao voltar ao destino correspondente; storage indisponível não quebra a entrada. Não existe parâmetro, storage ou variável que libere sessão simulada.

## Concorrência, expiração e saída

Web Lock exclusivo `bancaemdia:identity` serializa consulta/refresh/logout entre abas da origem. Cada aquisição consulta `/auth/session` novamente; se outra aba renovou, não emite outro grant. Refresh precisa mudar versão na mesma pessoa/família e retornar `refresh_required=false`. Sem Web Locks, sessão ainda válida pode ser lida, mas refresh/logout não são enviados; a interface oferece reentrada e não confirma saída.

BroadcastChannel transmite apenas `changed`, `ending`, `ended`, `logout_failed`. Não transmite pessoa, CSRF, versão ou cookie. Receber mudança exige consulta à API; logout remoto limpa dados locais imediatamente. Eventos não concedem autenticação.

`service.read` envolve apenas GETs seguros: 401 `access_expired` consulta/renova uma vez, verifica pessoa/família e repete a leitura uma vez. O cliente HTTP não faz refresh/retry de mutation. Outros 401 limpam contexto; 402 não faz logout. 503 mantém a identidade anterior oculta enquanto a conferência falha; Retry-After bloqueia tentativa antecipada e não há loop automático de grants.

Logout limpa dados privados antes do pedido e usa prova consultada dentro da trava. `logged_out=true`, ou consulta 401 confirmando sessão já encerrada, confirma a saída. Falha oferece **Conferir saída**, sem restauração automática nem promessa de revogação. Se a sessão passou a outra pessoa, não encerra a conta alheia. Logout local não promete apagar SSO do emissor.

## Consumidoras privadas

Cada request captura AbortSignal, prova e teste de contexto atual. Troca de pessoa/família ou logout cancela queries/retries, limpa queries **e mutations**, aborta requests e incrementa `privateEpoch`. Guard remonta a árvore privada: formulários/seleções React não atravessam a troca. Refresh na mesma família preserva formulários, mas descarta responses anteriores, inclusive se fetch ignorou aborto ou parsing terminou depois.

Novas consumidoras usam o cliente central. GET que admite recuperação explícita usa `service.read`; mutation nunca usa esse wrapper. Recursos fora da árvore React — arquivos, URLs de objeto, polling ou caches próprios — registram liberação via `service.registerCleanup` e removem o registro ao desmontar. Não persistir cache privado em storage/Service Worker; o futuro código de mídia deve cumprir essa limpeza, sem afirmar que mídia ainda ausente já foi implementada.

## Provas e publicação

Vitest verifica validação, deadlines, isolamento de queries/mutations/formulários, responses tardias, falha de logout e grants coordenados. Playwright testa o build público com backend HTTP controlado, três browsers e dois viewports; esses casos não são prova de emissor real nem novas telas do produto.

O workflow de identidade repete nove aceites backend e **quatro** cenários SPA sem skips: contrato cookie/CSRF/RLS e ciclo de sessão em 390×844/1440×900. O ciclo cria duas contas com emissor/SMTP reais, acessa API, renova entre duas abas com um único grant, troca usuário com cache aberto, sai pela aplicação e retorna do login hospedado preservando query/fragmento. PostgreSQL/emissor são descartáveis, sem tokens simulados ou dados pessoais em artifacts. Ver [reprodução](../identity-validation.md).

Docker não está disponível neste Windows; essa prova executa na CI Linux. Entrega exige todos os checks no SHA final, incluindo segurança. Publicação permanece condicionada a integração dos PRs frontend/backend, OpenAPI integrado, emissor/origens aprovados e homologação conjunta. Nenhum merge ou provisionamento faz parte desta implementação.
