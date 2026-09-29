# Runbook — Deploy

Plataforma Fase 1: nginx estático em Compose atrás de Caddy/TLS, na arquitetura Lightsail do backend. Decisão: [ADR008](../adrs/008-ci-cd-deploy.md). Infraestrutura, DNS e deploy ainda não foram executados; não há CD automático por merge/tag nesta etapa.

## Antes de implantar (#14 / #38)

1. Confirmar ambiente autorizado e capacidade, domínio/TLS, rede e API/emissor compatíveis; registrar versão do contrato por ambiente.
2. Exigir todos os checks verdes no SHA, incluindo budget, cobertura e segurança. Baixar o artifact `frontend-<SHA>-<evento>` do run correspondente; ele contém `dist/` e `dist-security/` da mesma compilação. Não usar artifact de fixture/relatórios como site.
3. Preparar release imutável (imagem por digest no fluxo #38), preservar HTML/assets/nginx juntos e registrar o digest anterior para rollback. Não editar/minificar HTML após build: isso invalidaria o hash CSP do tema.
4. Fornecer `config.json` público validado, montado somente para leitura; segredos nunca entram nele. A mesma origem HTTPS para site e `/api/*` é preferida. CSP/CORS de API/emissor externos só com origens exatas definidas em #49/#14.
5. Implantar conforme o procedimento operacional do ambiente; esta issue não fornece nem executa provisionamento.

## Smoke no ambiente real

- SPA deep link abre; asset/fonte inexistente retorna 404; configuração recebe JSON/no-store e nunca fallback HTML.
- TLS/headers/CSP sem violações, hash de tema correto, fonte local e ausência de flash; index revalidável e assets com hash imutáveis.
- Runtime aponta ao ambiente correto; health da API conforme contrato, sessão real, consulta e exportação reconciliadas. Um placeholder ou sessão injetada não aprova esse smoke.
- Publicar produção somente após #39; falha exige restaurar release anterior com [rollback](rollback.md).

A CI testa o nginx real em Docker; isso não comprova Caddy/TLS, DNS, emissor nem ambiente público.
