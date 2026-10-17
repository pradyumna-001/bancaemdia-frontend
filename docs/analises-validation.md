# Validação de Análises — #56, 17/10/2026

## Implementação e contrato

Direção A escolhida expressamente pelo titular depois de duas propostas, antes da implementação. `/painel/analises` reutiliza a sessão/controles existentes e o pin real único `86c82c9`, sem alterar suas 127 operações ou disponibilidade sandbox. [Contrato e limites](contracts/analises.md).

Mobile 390×844 e desktop 1440×900 têm valores com sinal/quantidade, tabela equivalente, recortes opcionais e caixa separado. Testes também cobrem 320px, ambos os temas, teclado/rolagem da matriz, ausência de select/date nativos e erros. Mock/proposta são fixtures isoladas; não certificam API ou release.

## Execução local

- `make lint typecheck test TEST_ARGS=--maxWorkers=1`: **1.325 testes / 85 arquivos aprovados**. A descoberta dessa execução antecedeu a adição do arquivo de teste do prazo compartilhado e do caso de remount; ambos estão na revalidação seguinte.
- Reexecução completa com os **1.328 testes / 86 arquivos**: lint/typecheck aprovados, 1.324 testes passaram e quatro testes anteriores de Revisão/Planilha excederam 5s durante execução concorrente com builds. Reexecução isolada dos dois arquivos completos: **57/57 aprovados**, sem alterar timeout, casos ou gates. Logs das duas tentativas preservados; o CI exige a suíte completa e cobertura no SHA final.
- Revalidação final dos quatro arquivos de teste afetados com V8 e as mesmas metas: **28 testes aprovados**. Arquivos de Análises: 99,26% statements/lines, 93,62% branches e 100% functions agregados; cada arquivo passa individualmente as quatro metas de 80% (menor branch é 85,55% em AnalisesPage). `useLeituraPainel` ficou com **100% nas quatro métricas**; `FusoPreferencia` preserva a cobertura acima do gate.
- Geração do OpenAPI inteiro já pinado: SHA-256 verificado, tipos/políticas preservados; apenas o descritor gerado da operação de análises foi acrescentado. JS inicial do build público: **194.966 / 200.000 bytes gzip**. Build e CSP gerados juntos, fixtures separadas de dist.
- A tentativa de cobertura global no Windows excedeu tempos de alguns testes anteriores sob instrumentação V8, inclusive reduzindo processos. Não aumentamos timeout, excluímos casos ou reduzimos metas. A suíte normal completa passou; a cobertura global continua obrigatória no CI Linux, com todos os arquivos, inclusive não importados. Não apresentar a medição focada como substituta dessa prova global.

## Matriz permanente

`tests/e2e/analises.spec.ts` acrescenta três casos em cada combinação Chromium/Firefox/WebKit e 390×844/1440×900: comparação/teclado/temas/reflow, erro com caixa preservado/Retry-After e build público recusando a fixture como entrada de sessão. Capturas incluem esporte e tela completa; o quadro de dias tem cabeçalhos persistentes na rolagem. Todas as tabelas são abertas simultaneamente na verificação de acessibilidade: regiões de comparação distinguem a dimensão e regiões de caixa distinguem a identidade da banca, inclusive nomes repetidos e população sem banca.

O cenário anterior de recuperação de rota também recebe os dados válidos de Análises/caixa na fixture isolada: espera ambas as seções antes de exigir foco no conteúdo. Sem esses dados, um erro novo de consulta recebia foco legitimamente após a recuperação, tornando o teste dependente da velocidade do navegador. A exigência de foco, GET único e URL preservada permanece; as seis combinações passaram localmente.

A jornada real também revelou uma corrida anterior no cadastro de fonte da Planilha: o botão ficava ativo enquanto a consulta inicial ainda inseria conteúdo acima do formulário. O cadastro agora informa a consulta e aguarda seu término, preservando o nome digitado; o submit também impede criar uma intenção durante essa leitura. O teste de regressão falha na versão anterior e passa com a correção; os 38 testes do arquivo e seis casos de navegador (três browsers/dois viewports) passaram localmente. A consulta de acesso após expiração no teste manual acompanha o HTTP 200 real recebido pela SPA e exige READ_ONLY, preservando as demais verificações de escrita bloqueada. A matriz atualizada exige 1.329 unitários e 726 casos de interface no CI, além das jornadas reais.

Nas jornadas de Análises, Caixa e Coleta, o trial já expirou antes da saída. O driver compartilhado aguarda o aviso READ_ONLY esperado e o fim da consulta do contador antes de um único clique físico em Confirmar saída; ambos podem reposicionar o botão durante a montagem. Mantém as provas de saída/401, limpeza e isolamento. Essa preparação de teste não altera o logout do produto nem condiciona sessão a billing; os cenários de billing indisponível continuam nos testes de autenticação/acesso.

`analises-contract.yml` exige **seis jornadas com SPA pública, API, PostgreSQL e emissor reais**, inventário exato, zero skips/falhas. Seed sintético inclui esportes positivos/negativos e não informado, freebet, pendências, revisão grave, banca/capital, depósito/saque. Exibição é comparada à resposta real, usando o próprio formatador canônico do frontend. Isolamento entre usuários, READ_ONLY após expiração natural, fuso salvo, filtros preservados e logout/401 fazem parte da jornada.

Os 66 casos reais anteriores, 26 aceites de proprietário e demais inventários continuam nos workflows existentes. Traces começam depois de autenticação/seed; argumentos/resultados/rede/storage são removidos e o gate de privacidade precede upload. Resultado dos checks e SHA final precisam constar na PR antes de retirá-la de rascunho. Uma execução local não substitui esses checks nem autoriza publicação.
