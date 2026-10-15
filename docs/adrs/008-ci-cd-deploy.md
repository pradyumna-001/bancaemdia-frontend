# ADR 008: CI, budgets e hospedagem estática

## Status

Accepted — implementação na issue #8, em 29/09/2026. Deploy real depende de #14/#38 e dos contratos de identidade/API; esta decisão não afirma ambiente provisionado.

## CI permanente

Push e pull request executam o SHA exato da branch, inclusive mudanças documentais. Preservam lint, tipos, testes, build, schema pinado sem drift, a suíte E2E completa em três browsers/dois viewports, pre-commit, Docker/nginx/CSP e GitGuardian. Nenhum sucesso anterior ou mock substitui integração real. O único job de qualidade mantém os nomes `Testes (push)` e `Testes (pull_request)`; sharding fica para quando duração medida justificar a complexidade.

Na #31, a suíte cresceu para 612 E2E. Em 14/10/2026, duas execuções do mesmo SHA concluíram os 1.168 testes unitários e os 612 E2E, mas atingiram os 20 minutos durante as etapas finais de pre-commit/Docker/nginx. O tempo máximo do job passa a 25 minutos para incluir instalação, suíte completa, build da imagem e verificações de rotas/CSP. Os limites individuais dos testes e os gates de cobertura, bundle, Lighthouse, segurança e execução sem skips continuam os mesmos.

A #8 acrescenta:

- Cobertura V8 com Vitest da mesma versão, incluindo arquivos não importados em `src/lib` e `src/features`. Mínimo **80% por arquivo** em linhas, statements, funções e branches. Excluídos apenas testes e declarações de tipos; nenhuma exclusão da demonstração. `make test:coverage` executa a suíte inteira e o gate.
- JavaScript inicial **<=200.000 bytes gzip** (KB decimal). `make build check:bundle` lê HTML e manifesto Vite, percorre imports estáticos e modulepreloads, inclui script inline de tema e deduplica assets compartilhados. Imports dinâmicos só entram quando pré-carregados na entrada. Soma gzip nível 9 de cada recurso; falta de arquivo/manifesto, script externo e excesso falham. CSS/fontes têm leitura pelo Lighthouse, não desconto ou exceção no budget JS.
- Lighthouse 13.5.0, Node de referência 22.22.0. `make measure:lighthouse` mede `/login` do build público, uma execução fria mobile e uma desktop, e guarda HTML/JSON, versão e métricas. Pré-verificação exige a página Entrar montada; erro de configuração não vira baseline válido. O runtime público de medição aponta para loopback e não cria sessão nem chama a API.
- A medição Lighthouse é obrigatória; ausência de resultado/erro de ferramenta falha. Os alvos de release continuam >=95 em performance/acessibilidade/boas práticas, LCP <2500ms e CLS <0,1. Na #8 os valores são registrados, não confundidos com gates finais da #37. TBT é diagnóstico de laboratório, não INP; P75 e INP <200ms exigem medição de campo/jornadas futuras. Login provisório não certifica telas autenticadas, API real ou WCAG completa.
- Artefato `frontend-<SHA>-<evento>` contém apenas `dist/` e `dist-security/`, capturados juntos antes dos rebuilds E2E. `dist-shell-fixture/` nunca é publicado. Relatórios de cobertura, bundle, Lighthouse e Playwright ficam no artifact de validação. Upload não é deploy.

Configuração V8: [documentação oficial](https://v3.vitest.dev/config/#coverage). Medição Lighthouse: [ferramenta oficial](https://github.com/GoogleChrome/lighthouse). Não se adiciona biblioteca de gráficos nem dependência de runtime para essa instrumentação.

## Plataforma escolhida para Fase 1

**SPA estática no nginx não privilegiado já versionado, em Compose, atrás do Caddy/TLS da arquitetura Lightsail prevista pelo backend (PR #146).** Essa opção reutiliza o artefato/servidor que a CI testa e acompanha a fase operacional existente. Não pressupõe ECS/ALB, conta de provedor adicional, CDN ou novo serviço pago. Não foi executado apply, provisionamento, DNS ou deploy.

A integração #14 deverá confirmar capacidade da instância, domínio/DNS/TLS, rede entre Caddy/nginx/API, rollback e disponibilidade operacional da Fase 1. Se o ambiente não comportar o site, revisar este ADR antes de contratar/provisionar outra plataforma.

Origem preferida: uma origem HTTPS de aplicação, com Caddy encaminhando `/api/*` **e `/auth/*`** à API e demais caminhos ao frontend (contrato #49 / ADR003). O callback não pode cair no fallback da SPA. O nginx serve a SPA, não recebe credenciais de backend. `VITE_API_URL` deve ser a origem pública da aplicação nesse arranjo; não duplicar `/api/v1` na base. A topologia e a versão compatível da API só são publicadas após smoke conjunto. Nenhum domínio fictício é configurado como ambiente real.

CSP continua estrita: script próprio + hash exato do tema, fontes próprias, sem `unsafe-inline`/wildcards. API na mesma origem cabe em `connect-src 'self'`. Se #49 exigir conexão com emissor externo ou outra origem API, registrar origens HTTPS exatas em CSP/CORS antes do deploy; o `config.json` não amplia permissões. Callbacks e refresh dependem do contrato de identidade, sem escolher transporte de token por conveniência da hospedagem.

## Configuração, promoção e rollback

`/config.json` público contém somente `VITE_API_URL`, `VITE_APP_ENV`, `VITE_UPLOAD_POLL_MS`; tem no-store, timeout de 5s e validação antes do boot. O Compose monta esse arquivo somente para leitura. O build pode não conter URL: a configuração runtime completa é pré-requisito de implantação. Segredos nunca entram no dist/config/bundle.

HTML, assets e configuração nginx com hash CSP formam uma unidade imutável. Releases futuros usam tag/SHA e imagem por digest; promoção/rollback preservam a unidade, com configuração runtime do ambiente versionada separadamente. SLA de rollback <7min é meta a ensaiar em #14/#38, não prova de operação existente. Ver runbooks de deploy e rollback.

Não há CD automático neste PR. Homologação depende de #14; produção, de #38 e aceite #39. Merge em main não provisiona infraestrutura nem publica o site.

## Proteção de branch

Consulta de 29/09/2026: repositório público, conta autenticada com push/triage, **admin=false e maintain=false**. Leitura de proteção de main devolveu 404 e lista de rulesets vazia; com essa permissão não é possível afirmar nem modificar a configuração completa de proteção. Não tentar contornar esse limite com tokens ou remover checks.

A configuração proposta e o procedimento administrativo estão em [branch-protection.md](../runbooks/branch-protection.md). Aplicação depende de administrador e é impedimento externo registrado, permitido pelo aceite da #8. Enquanto isso, workflow e regra de entrega continuam exigindo todos os checks verdes, mas não substituem enforcement de merge no GitHub.

## Revisão #28 — 15/10/2026

Backend #200/PR #201 entrega o protocolo pendente. Sandbox único 547a4d0cfce5308dfe71221a77ad6fd5eb6e47cd incorpora #201 ao b37a3f8 e preserva todas as operações anteriores. OpenAPI de 125 operações, hash 09cf9fbb4b46a8dfc20fc4f4a3c97c3b88000612308cfb4e1e8fd4565901854a; sem união de schemas ou publicação. Seis jornadas reais de Revisão e 56 aceites PostgreSQL são acrescentados às provas anteriores. Job central reserva 25 minutos para o inventário ampliado, sem mudar limites de teste/pedido, cobertura, budget JS ou regra de zero skips. [Contrato](../contracts/revisao.md).
