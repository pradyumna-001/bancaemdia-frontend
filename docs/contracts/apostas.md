# Lista operacional de apostas — #18

## Versões e dependências

Esta PR é independente, com base `main`. Depende da emergência backend [#186](https://github.com/pradyumna-001/bancaemdia-api/issues/186)/[PR #187](https://github.com/pradyumna-001/bancaemdia-api/pull/187), dos filtros [#183](https://github.com/pradyumna-001/bancaemdia-api/issues/183)/[PR #184](https://github.com/pradyumna-001/bancaemdia-api/pull/184), dos componentes frontend #17/PR #74 e da base de acesso/entrada/configurações herdada da PR #80. O merge continua com o administrador.

O único OpenAPI público candidato é #187, commit `186be7482437eb5dd4b70914843dc6c5f90395f1`, hash `fc0e3ee8f02d5bcc11822c14979f9a3f6702d7e8bafb3c0df8fd30b1ac6c5699`. `config/api-contract.json` distingue essa revisão da base integrada `b916f54331f14cf47a3800324bd61d8638043c06`. `gen-types` gera tipos, políticas e `site-read.generated.ts` do mesmo documento verificado. Este último contém apenas metadados de rotas/query e validadores de respostas publicados; as projeções de apresentação aceitam `unknown` somente após essa validação. Não define DTOs de domínio à mão nem combina respostas de branches.

O candidato #187 possui a lista legível, mas não publica `/painel/filtrado` ou `/filtros/{dimensao}`. A aplicação preserva filtros sem suporte, explica o impedimento antes de consultar e não substitui o resumo filtrado pelo painel global. Não cria grupos/bancas, nomes ou IDs fictícios na aplicação. A URL `apagadas=1` nunca é simulada filtrando uma página local; `apagadas=todas` usa `incluir_apagadas=true` somente onde essa é a semântica publicada.

Após integração de #187 e #184, reconciliar as dependências frontend, escolher um único commit oficial integrado, atualizar manifesto/hash e executar `pnpm gen-types`, drift, testes e `pnpm check:contract-integration`. Os descritores gerados passam a habilitar os endpoints completos já implementados. O gate de publicação não foi relaxado e recusa esta candidata aberta.

## Apresentação e população

Decisão visual de 10/10/2026: Lista compacta é o padrão; Cartões conserva a visualização detalhada. `visualizacao=lista|cartoes` é estado de apresentação na URL, nunca parâmetro da API nem parte da chave das consultas. Alternar preserva filtros, posição, histórico e páginas carregadas, sem refetch. Valor inválido/repetido cai para Lista compacta. Cada aposta mantém detalhes expansíveis, inclusive textos completos; o resumo não depende da apresentação.

`GET /api/v1/apostas` fornece textos e contextos em lote. Nenhum GET de detalhe é feito por item. Evento, descrição, mercado, casa e contextos nulos recebem orientação honesta. Referências de conta/banca são as registradas na aposta; nomes são atuais, titular arquivado e conta inativa são identificados. A banca da aposta não é substituída pela banca atual da conta. IDs textuais BIGINT permanecem exatos.

Valor, lucro, retorno, odd e ROI são formatados dos valores da API. Não há soma, inferência de lucro, saldo, custo ou ROI. Freebet exibe valor de face. Resumo usa todos os mesmos seletores, sem paginação; timestamp da API deixa explícitas possíveis alterações entre consultas. Se não houver resumo compatível, os valores individuais continuam disponíveis e o resumo indisponível é informado, sem zero fabricado.

`Mostrar mais` usa página/tamanho/total da resposta e preserva filtros, posição e página inicial da URL. Chaves duplicadas mantêm posição e recebem a versão mais recente. Totais alterados entre páginas recebem aviso de atualização; o cliente não afirma ter reconstruído uma população estável. Página posterior vazia oferece retorno à primeira página sem perder parâmetros, inclusive repetidos. Vazio inicial e sem resultado filtrado têm ações distintas.

Mudança dos seletores da lista na mesma rota preserva o guard atual e o foco do picker. RequireSession e cada leitura continuam exigindo a identidade corrente; abrir outra área, recarregar ou revalidar explicitamente consulta a sessão novamente. Logout/troca/401 continuam removendo dados privados. A alteração de filtro é uma consulta, sem ocultar a tela inteira para conferir novamente a mesma sessão a cada toque.

GETs seguros seguem a política central de retry e Retry-After, com ação manual bloqueada até o prazo. Atualização falha mantém os dados carregados; falha de página seguinte repete aquela página. Erros 404/405 não oferecem repetição. Catálogos têm busca, paginação e resolução autorizada de seleção histórica. Sessão e acesso comercial são independentes: READ_ONLY conserva leitura e encaminha entrada ao Telegram; consultas são canceladas/descartadas após logout ou troca de identidade.

## Evidências e limites

Testes unitários cobrem projeções, nulidade, IDs, paginação/deduplicação, equivalência de filtros, respostas inválidas, atualização, acesso e descarte após logout. E2E da apresentação cobre 390×844 e 1440×900, reflow 320px, Claro/Escuro, teclado/foco, acessibilidade, filtros/histórico, erro e Retry-After. O CI mantém Chromium, Firefox e WebKit.

O job **Identidade real** testa a SPA pública com PostgreSQL, Keycloak, SMTP e cookies reais contra a única árvore #187. Inclui criação pela API, textos históricos, conta/titular inativos, banca registrada, BIGINT, páginas, edição/refetch, leitura e isolamento entre usuários, além de todas as provas de identidade anteriores. O job **Filtros reais** testa seleção/resumo/apagadas/catálogos com cookies e banco reais na única árvore #184. Não são uma prova de deploy combinado. Cada relatório exige o número exato de casos e zero skips/falhas.

`tests/fixtures/apostas-contract.generated.ts` verifica o OpenAPI inteiro de #184, hash `ed837f9a47ea15e839c543412f9aee2bd9a90332ae0a54936c95235c6d432bd5`. É exclusivo do build `dist-apostas-fixture`, com CSP correspondente em `dist-apostas-security`; não entra no build público ou no manifesto produtivo. O preview fornece dados simulados explicitamente rotulados. O job de API real serve o mesmo build estático com proxy/cookies reais, sem o middleware simulado. URL, storage e configuração pública não ativam sessão ou contrato de teste.
