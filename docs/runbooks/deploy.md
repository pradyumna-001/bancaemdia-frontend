# Runbook — Deploy

Plataforma Fase 1: nginx estático em Compose atrás de Caddy/TLS, na arquitetura Lightsail do backend. Decisão: [ADR008](../adrs/008-ci-cd-deploy.md). A #14 prepara [workflow manual, pareamento, variáveis/secrets, smoke e restauração](../contracts/homologacao.md); ambiente público ainda depende da ativação registrada na backend #41, infraestrutura #181 e identidade #168. Não há CD por merge/tag nem provisionamento executado.

## Antes de implantar (#14 / #38)

1. Confirmar ambiente autorizado e capacidade, domínio/TLS, rede e API/emissor compatíveis; registrar versão do contrato por ambiente.
2. Exigir todos os checks verdes no SHA, incluindo budget, cobertura e segurança. Baixar o artifact `frontend-<SHA>-<evento>` do run correspondente; ele contém `dist/` e `dist-security/` da mesma compilação. Não usar artifact de fixture/relatórios como site.
3. Preparar release imutável (imagem por digest no fluxo #38), preservar HTML/assets/nginx juntos e registrar o digest anterior para rollback. Não editar/minificar HTML após build: isso invalidaria o hash CSP do tema.
4. Fornecer `config.json` público validado, montado somente para leitura; segredos nunca entram nele. Usar mesma origem HTTPS: proxy encaminha `/api/*` **e `/auth/*`** ao backend. Callback `/auth/callback` não pode receber HTML da SPA. CSP `connect-src 'self'` cobre o transporte por cookie; emissor é navegação hospedada. Origens/callback/emissor e versão integrada precisam dos gates de [identidade](../contracts/identidade.md) e #14. Não copiar cookie inseguro do sandbox para produção.
5. Para homologação, seguir `docs/contracts/homologacao.md`, revisar o Caddyfile conjunto e preparar o ambiente GitHub `staging` restrito à main. Usar o workflow `Homologação do frontend` com ID da CI de push do mesmo SHA da main. O workflow valida pareamento e credenciais, promove por digest sem recompilar e confirma somente após smoke real; não fornece nem executa provisionamento.

## Smoke no ambiente real

- SPA deep link abre; asset/fonte inexistente retorna 404; configuração recebe JSON/no-store e nunca fallback HTML.
- TLS/headers/CSP sem violações, hash de tema correto, fonte local e ausência de flash; index revalidável e assets com hash imutáveis.
- Runtime aponta ao ambiente correto; health da API conforme contrato, sessão real, consulta e exportação reconciliadas. Um placeholder ou sessão injetada não aprova esse smoke.
- Publicar produção somente após #39; falha exige restaurar release anterior com [rollback](rollback.md).

A CI testa o nginx real em Docker; isso não comprova Caddy/TLS, DNS, emissor nem ambiente público.
