# Painel — #20 / ADR016 / ADR019

## Versão e dependências

O titular autorizou concluir #20 contra main com dependências declaradas em 11/10/2026. A emergência backend [#188](https://github.com/pradyumna-001/bancaemdia-api/issues/188) está na [PR #189](https://github.com/pradyumna-001/bancaemdia-api/pull/189), candidata única `22d5b77f946c58dda4f0eeb64db201ee5c63c009`, OpenAPI oficial SHA-256 `6c6dec092148ef9d03ad37fa331dd2b62e30b209632e9811aa6e07d911c96036`. Seus 27 checks estavam verdes na conferência. O merge permanece com o administrador. A baseline integrada continua `b916f54331f14cf47a3800324bd61d8638043c06`.

Tipos, políticas e descritores de leitura são gerados do documento inteiro de #189; não se compõem schemas. A candidata contém os filtros/catálogos da #184, mas não a projeção de apostas da #187. A atualização precisa ser reconciliada com #187/#81/#84 quando o administrador integrar as entregas. `check:contract-integration` continua impedindo publicação de contrato candidato; provas de sandbox não são deploy.

A PR frontend tem base main, sem PR empilhada. Incorpora suporte herdado de #80 (Configurações, acesso comercial, Enviar e Conexões), #74 (filtros), #69 (formatadores) e #83 (correção de conta). A descrição separa essas dependências do escopo próprio do Painel. Não implementa novamente as jornadas de #18/#19.

## População e dados

- Diário, grupos e Excel usam `/painel/filtrado/diario`, `/painel/filtrado/grupos` e `/painel/filtrado/detalhado/export` do mesmo contrato. Os seletores normalizados devolvidos no diário vinculam grupos, comparações e exportação ao mesmo recorte.
- Critério: `data_aposta`, fuso fixo `America/Sao_Paulo`, BRL legado, fonte `apostas_ao_vivo`. A preferência pessoal de fuso não altera esse contrato.
- Cada resposta tem snapshot próprio. Uma paginação não congela as outras consultas. Alterar apostas requer atualizar todo o Painel; totais divergentes do mesmo grupo entre páginas causam erro explícito, sem soma ou mistura.
- Valores monetários e identidades novas permanecem strings exatas. Somente coordenadas normalizadas do desenho passam a Number. Comprimento da barra é proporcional ao lucro absoluto, espessura à raiz da quantidade; isso é geometria, sem decisão financeira.
- Confirmado, zero confirmado, sem atividade, pendente, parcial, desconhecido e fora do financeiro têm texto próprio. Nulo nunca vira zero. Parte conhecida e quantidades de pendência/revisão/contexto são preservadas.
- Grupos são vínculos explícitos da aposta. Tipsters distintos são identificados dentro de cada grupo, com parcelas sem atribuição e grupo arquivado visíveis. Nenhuma inferência de participação atual ou dupla soma.

## Navegação, exportação e resiliência

O diário tem intervalos de 14 ou 90 dias. `diario_tamanho` e `diario_inicio` são parâmetros não secretos da URL; os cursores opacos ficam em memória. Datas inválidas usam o início do recorte, sem enviar entrada inválida. Grupos paginam pares grupo/tipster com upsert por identidade, preservando total completo do grupo e contador de filhos carregados. Antes de enviar uma janela compartilhada, a UI consulta os limites do recorte atual; janela fora deles cai para o início com mensagem, sem enviar `inicio_dia` inválido. Os seletores canônicos omitem o alias `incluir_apagadas` quando há `visibilidade`, inclusive quando a resposta ecoa false, e nunca combinam período com limites normalizados.

Excel é GET seguro, permitido também em leitura, com todos os dias e pares do recorte. Não usa cursor, tamanho da página ou subtotal visível. O Blob privado é validado, baixado e revogado; logout/troca aborta a requisição e descarta resposta tardia. Não há cálculo ou consentimento de gasto na tela.

Seções falham individualmente; dados válidos anteriores permanecem após falha de leitura, exceto uma combinação inconsistente de páginas. Retry segue ADR005: limites por código, sem repetição de escrita. Retry-After pertence à página/sessão e não se reinicia ao trocar filtros ou atualizar seções. 404/405 não oferecem repetição.

Saldo global é explicitamente de todas as contas e todo o histórico, com total desconhecido separado da parte conhecida. O acumulado legado é exibido apenas para período/casa/tipster/mercado e apostas ativas, seu recorte efetivamente suportado. Filtros mais amplos mostram a indisponibilidade do acumulado, mantendo o diário equivalente. Série materializada identifica consolidação, buckets e consulta separada; não se subtraem acumulados nem se chama bucket de dia. Comparações mostram lucro liquidado conhecido por casa/tipster/mercado, distinguindo-o do total completo do diário.

## Verificação

A proposta isolada em `tests/fixtures/painel-proposta/` foi aprovada pelo titular antes da implementação. A demonstração da tela real está em `tests/fixtures/painel/`, com build separado `dist-painel-fixture`; ambos ficam fora do aplicativo público.

Testes unitários cobrem estados monetários, BIGINT, atribuição, paginação sem soma, inconsistência entre páginas, filtros, recuperação, exportação e descarte após logout. E2E percorre diário e grupos por teclado, Excel, leitura, reflow 320px e acessibilidade em 390×844 e 1440×900 nos três motores do CI. A prova de identidade mantém todos os 14 casos anteriores e acrescenta dois casos de Painel com SPA pública, API #189, PostgreSQL, cookie real, 52 pares paginados, período com 46 dias, Excel integral, isolamento de outro usuário e logout. O gate exige os 16 casos, sem skips.

O monitor de erros distingue documentos por origem, conforme a prova comercial existente: qualquer erro JavaScript da SPA ou de uma origem inesperada reprova, inclusive após logout. Erros do documento hospedado do emissor de sandbox permanecem contabilizados em `hosted_document_pageerrors` no XML, sem URLs de protocolo ou credenciais. A jornada do emissor conserva seu gate próprio; essa distinção não remove casos nem transforma prova de sandbox em deploy.
