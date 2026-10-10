# Sessão no aplicativo — #11

ProvedorAuth consulta a identidade real, protege as rotas existentes e conecta o contador de Revisão ao GET tipado. Entrar navega para o emissor via `/auth/start`; Confirmar saída chama o logout da API. A #12 substitui as ações provisórias pelas [telas de conta](conta.md), preservando esse serviço. Sessão válida não concede assinatura ou FULL_WRITE; 402 preserva identidade, sem repetir escrita.

A conferência inicial pertence ao loader protegido ou à jornada pública de conta. Páginas públicas de ajuda/tutorial não iniciam pedidos de identidade; foco/visibilidade só reconferem um contexto que já tem pessoa. Isso evita pedidos desnecessários durante navegação de documentos. As telas de conta (#12) iniciam somente as operações necessárias à sua jornada.

Referência histórica de identidade: backend [PR #168](https://github.com/pradyumna-001/bancaemdia-api/pull/168), SHA `ad7cd9fb095ee6b1b9855504a42e23d25341dee2`, [contrato](identidade.md), [ADR003](../adrs/003-api-client-typing-session.md). A #52 adota a árvore única integrada `b916f54331f14cf47a3800324bd61d8638043c06`, que inclui identidade e billing, com SHA-256 em `config/api-contract.json`. Nenhum schema de PR foi concatenado. Integração não afirma deploy ou homologação do emissor.

## Fronteira e estado

`protocol.ts` recebe `unknown`, valida campos de controle e produz `SessionContext` interno. Não declara a resposta `SessionStatus` manualmente. Esse contexto contém identidade, versão, prova e sinal de renovação somente em memória; React recebe apenas pessoa, fase, erro seguro e geração privada. Os tipos de domínio já vêm do OpenAPI integrado completo. O serviço dedicado de sessão preserva sua validação de fronteira, Web Lock e coordenação de refresh/logout; não passa essas operações pelo gate comercial nem por retry de mutations.

Todos os pedidos usam cookie, `credentials: include`, sem Authorization, cache no-store e deadline incluindo corpo. Prova CSRF acompanha somente POST autenticado. Cookie é HttpOnly/Secure em HTTPS; a exceção HTTP é exclusiva do sandbox de loopback. URL, payload, provas e tokens não entram em erros, logs ou artifacts. Fases: conferindo, anônimo, autenticado, encerrando e erro recuperável. Entrada fica indisponível durante conferência/erro da API, com tentativa explícita antes da navegação hospedada.

Compose local aponta à mesma origem 8080, preservando CSP `connect-src 'self'`. O nginx estático retorna 503 JSON/no-store em `/auth/*` e `/api/*` quando não houver proxy upstream; callback não recebe HTML da SPA. Produção exige proxy anterior ao servidor estático, conforme o runbook. Esses 503 não substituem API real nem relaxam a CSP.

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

O workflow de identidade repete nove aceites backend e **quatorze** cenários SPA sem skips: contrato cookie/CSRF/RLS, ciclo de sessão, cadastro/recuperação, confirmação expirada, acesso comercial, importação Telegram e preferência de fuso em 390×844/1440×900. O ciclo cria duas contas com emissor/SMTP reais, acessa API, renova entre duas abas com um único grant, troca usuário com cache aberto, sai pela aplicação e retorna do login hospedado preservando query/fragmento. A prova comercial usa expiração real no servidor, preserva leitura/exportação e reconfirma acesso sem reenviar escrita recusada. PostgreSQL/emissor são descartáveis, sem tokens simulados ou dados pessoais em artifacts. Ver [reprodução](../identity-validation.md).

Docker não está disponível neste Windows; essa prova executa na CI Linux. Entrega exige todos os checks no SHA final, incluindo segurança. Publicação permanece condicionada a integração dos PRs frontend/backend, OpenAPI integrado, emissor/origens aprovados e homologação conjunta. Nenhum merge ou provisionamento faz parte desta implementação.
