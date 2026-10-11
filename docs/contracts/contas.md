# Contas e titulares — #32

## Versão e dependências

CRUD, matrizes, ativação e financeiro foram integrados pela backend #136 em 05/10/2026 e estão na main `b916f54331f14cf47a3800324bd61d8638043c06`. O catálogo canônico de casas do site depende de #184, contido na candidata única #189 `22d5b77f946c58dda4f0eeb64db201ee5c63c009`, SHA-256 `6c6dec092148ef9d03ad37fa331dd2b62e30b209632e9811aa6e07d911c96036`. Não usar catálogo de instalações como identidade de conta.

A branch parte de main frontend `b5fb27d` e incorpora a base revisável da PR #85 `74f81a2` para preservar sessão, acesso comercial, filtros, Configurações, Painel e a correção visual de login. Este código herdado é separado do escopo da #32 na PR; não há base de PR empilhada. #85, seus antecedentes e backend #184/#189 precisam de integração/reconciliação antes da publicação. #187/#81/#84 não foram unidos ao schema. O gate de integração permanece bloqueando deploy da candidata.

Tipos, políticas e descritores são gerados do documento integral pinado. O gerador inclui recibos 201 e 200, matrizes nas duas direções e financeiro. Não existem shapes de domínio locais para antecipar uma API.

## Comportamento

- `/contas` lista titulares paginados; busca e inclusão explícita de arquivados vivem em `buscar_titular`, `titulares_pagina` e `arquivados=1`. Não confundir arquivados de titular com `apagadas` de aposta. Parâmetros inválidos têm defaults; IDs fora da precisão aceita pelo endpoint impedem a consulta financeira sem apagar o filtro.
- `/contas/:titularId` consulta todas as contas do titular e suas vigências. A matriz por casa é consultada pela API, sem filtrar uma página para simular o conjunto. Casa na URL não restringe a matriz do titular: a tela informa essa diferença.
- Titular é pessoa; conta é um vínculo estável na casa; banca é outro conceito. Nenhum cadastro solicita credenciais da casa. Conta nova não é ativada automaticamente.
- Cadastro, nome, apelido, estado e ativação usam apenas operações publicadas. `acoes_validas` autoriza os controles de conta; o servidor revalida a cada escrita. A ativação usa o horário do servidor e não escolhe a primeira conta. Estado EM_USO não é opção de edição.
- Arquivo de titular tem confirmação modal, Escape e retorno de foco. DELETE preserva histórico; conta em uso causa conflito sem arquivo silencioso. Encerramento da conta exige botão explícito de confirmação e preserva vigências. A troca temporal com prévia/aplicação é escopo da #53, identificada como pendente, sem ação fictícia.
- Financeiro recebe casa/titular/conta e limites desde/ate em Brasília, fim exclusivo. Outros filtros persistem no endereço com escopo explicitamente distinto. Lucro, giro, ROI, movimentos e categorias UNASSIGNED/contas sem titular vêm prontos da API. Saldo atual é all-time, sem corte por datas; null aparece como Não informado, zero válido continua zero. Totais não são somados no cliente.
- Leituras têm recuperação limitada, deadline Retry-After compartilhado e erro por seção. Escritas não são repetidas. Resultado desconhecido bloqueia novas escritas até consulta explícita do estado; falha dessa consulta preserva o bloqueio. 422/402 preservam os campos e nunca exibem payload privado. READ_ONLY mantém listas, matrizes, histórico e financeiro.
- Logout/troca de usuário abortam pedidos e desmontam forms/recibos privados. Captura de sessão é conferida depois da resposta; código antigo não atualiza o novo usuário. Catálogos consultam apenas a dimensão necessária. Picker com portal evita formulários HTML aninhados e mantém teclado/foco.

## Evidências e limites

Testes unitários exercitam CRUD, arquivo/concorrência, ações autorizadas, precisão, datas, erro isolado, readonly, timeout sem replay e limpeza de sessão. E2E exige Chromium/Firefox/WebKit em 390×844 e 1440×900, axe, foco/Escape e reflow 320px. Screenshots saem em `contas-titulares.png` e `contas-do-titular.png` nos artefatos da CI.

O gate real acrescenta `test_public_spa_contas_titulares` nos dois viewports aos dezesseis casos existentes: build público, API candidata integral, PostgreSQL, emissor hospedado e cookie HttpOnly/CSRF; cadastro/edição, ativação, matriz nas duas direções, conflito de arquivo, arquivo permitido com histórico preservado, isolamento, 402 após expiração e logout 401. Inventário exige dezoito casos SPA e nove backend, zero skips. Diagnósticos do documento hospedado do emissor são registrados apenas como contagem; erros da SPA falham o gate. Isso comprova sandbox, sem afirmar integração ou deploy.

Demonstração exclusivamente em `tests/fixtures/contas/` e `dist-contas-fixture`, com nome/valores simulados identificados. Não integra `dist`, não libera sessão por URL/storage e não substitui a prova real.
