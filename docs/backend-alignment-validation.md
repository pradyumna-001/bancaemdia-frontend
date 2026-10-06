# Validação do alinhamento — issue #48

## Escopo

Correção incremental sobre a issue #7: inventário de produto/contratos, planejamento completo e rotas/navegação da fundação. As novas páginas são explicitamente páginas em preparação; não implementam assinatura, contas, calculadoras ou chamadas de API. O pin do schema permanece na main auditada.

- 32 issues futuras existentes (#8–39) reescritas, 11 criadas (#49–59).
- Os 43 títulos e corpos remotos foram comparados integralmente com `docs/backlog/manifest.json` e os arquivos canônicos após publicação.
- As sete issues da fundação receberam notas de revisão, preservando seus aceites históricos e vinculando #48/ADR019.
- Manifesto cobre exatamente #8–39 e #49–59; links locais do backlog, auditoria, README e ADR019 verificados.

## Comportamento coberto

Testes de componente e guard cobrem as novas rotas protegidas, retorno interno e identificação da seção em rotas filhas. E2E cobre navegação para Contas e titulares, Assinatura e Calculadoras, preservação de query params, indicação da seção, inventário único e isolamento da sessão simulada.

Capturas do menu foram inspecionadas em 390×844 e 1440×900, Claro/Escuro; o teste existente também verifica reflow em 320px, teclado, foco e axe. Não há mudança de tokens, marca, geometria dos gráficos nem regra financeira.

## Execução e limites

`make lint typecheck test` validou 234 testes de unidade/componente. A suíte local de navegador executou 78 casos com sucesso (Chromium completo e 38 WebKit); o Firefox Windows falhou no lançamento com `spawn UNKNOWN`, inclusive após reinstalação, e dois testes preexistentes de tabulação da página 404 falharam no WebKit Windows. Nenhum teste foi removido, ignorado ou relaxado. Esses resultados locais não são evidência de suíte completa verde.

O CI Linux existente executa os 120 casos em Chromium, Firefox e WebKit, nos dois viewports, além de lint, tipos, unidade, build, drift do schema, pre-commit, nginx/CSP e Docker. A entrega do PR exige todos os checks aplicáveis verdes no SHA final, incluindo segurança. O resultado definitivo é registrado no PR; versões de backend ainda em PR ou sem contrato permanecem dependências explícitas do backlog.
