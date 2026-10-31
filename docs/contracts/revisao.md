# Revisão por motivo — #28

## Disponibilidade e proveniência

Backend #200 / [PR #201](https://github.com/pradyumna-001/bancaemdia-api/pull/201), candidato `e830c436dbdeb763f7a7d09b1d849fdbb6652db7`, entrega a projeção por família, escolha explícita de tipster e protocolo condicional. Não é merge nem deploy. O backend forneceu a árvore `27054591bf223d97151b06b0ab2632ccd20048d3`, filha direta de `b37a3f88b922b471d25d5f1c92c84b336cd2c9c0`. O pin de validação é a descendente `547a4d0cfce5308dfe71221a77ad6fd5eb6e47cd`, que apenas atualiza o head esperado e restaura o inventário de tabelas da planilha nos testes da reconciliação, sem mudar código da API, migrações ou OpenAPI. Preserva as 120 operações anteriores e acrescenta cinco. O OpenAPI completo gerado pelo aplicativo tem SHA-256 `09cf9fbb4b46a8dfc20fc4f4a3c97c3b88000612308cfb4e1e8fd4565901854a`. Não há união de schemas. Tipos, descritores e políticas `x-bancaemdia-review` provêm desse mesmo documento verificado.

O pin permanece `sandbox_reconciliation`. Publicação bloqueada até integração administrativa, reconciliação de um único pin integrado e repetição das provas. Dependências frontend: #93 (herda #92 e consumidoras anteriores); backend: #201 e fontes enumeradas em `config/api-contract.json`. PR contra main, sem empilhamento; escopo próprio começa após `4b9058fc4e40c7c50d653d31757e2e96d7b0c22d`.

## População e evidência

GET `/api/v1/revisao-operacional/fila` filtra a população inteira antes de paginar. Família e intervalo de abertura vivem em `motivo`, `aberta_desde`, `aberta_ate`; página em `revisao_pagina` e item em `revisao_item`. Dias civis são convertidos pelo utilitário do fuso São Paulo para `[desde, ate)`, incluindo o dia final inteiro. Idade é intervalo de `criado_em`, não data da aposta/jogo nem filtro local da página. Parâmetros inválidos caem nos padrões; filtros de Apostas permanecem na URL com escopo explícito.

Contagens filtradas, por família e global são rotuladas separadamente e vêm do mesmo snapshot. A resolução consulta novamente a página 1 com o mesmo recorte, evitando saltos na fila que diminui. `GET /revisao/stats` continua global, é invalidado após resolução e pode ocultar a aba; a página vazia mantém saídas navegáveis.

GET `/revisao-operacional/revisoes/{revisao_id}` entrega evidência autorizada atual. Ações vêm de `acoes`, sem inferência por rótulo. IDs BIGINT viajam como strings exatas inclusive no serializador do caminho. Nulos permanecem desconhecidos; nenhum cálculo financeiro ou soma das fontes no cliente.

- Leitura: corrigir campos publicados ou confirmar descarte (apaga a aposta dos totais, preservando histórico/restauração); stake desconhecida exige entrada humana.
- Conta: casa, instante do jogo e matriz; escolha explícita de candidato elegível, inclusive histórico/sem titular. Nenhuma primeira conta pré-selecionada nem foto obrigatória. Ausência de candidato encaminha a Contas e titulares e exige consulta atual.
- Par legado/consolidação: comparar ambas as fontes; MESMA, DISTINTAS ou RECUSAR_VINCULO conforme API. Conflito exige tipster `casa`/`telegram` explícito. Casa financeira e Telegram contextual não são somados. Descarte não substitui recusa de vínculo.
- Print incompleto: correção/descarte usa a operação publicada, que delega ao materializador #195, sem aposta financeira fictícia.
- Não suportada: encaminhamento seguro pelo número da revisão, sem inventar canal externo nem ação arbitrária. Resolvida não oferece ações.

## Escrita e recuperação

POST `/revisao-operacional/operacoes/{operacao_id}` revalida FULL_WRITE atual e envia `precondicao` opaca da evidência. O UUID é registrado em `revisao_operacao` e confirmado pela navegação antes do primeiro POST. Consulta/releitura permanecem bloqueadas desde a preparação do UUID até o encerramento desse envio, inclusive antes de o transporte começar; um teste verifica o estado no commit da navegação. Corpo, formulário, pré-condição, recibo e mídia existem somente em memória. Duplo clique é bloqueado; confirmação exigida para descarte e decisões sobre pares.

Resultado desconhecido não repete mutation. Gesto explícito consulta GET da mesma identidade; 404/410 não provam rollback. Replay exige 404 consultado, mesmo corpo/UUID ainda em memória, gesto separado e FULL_WRITE atual; conflito 409 exige releitura. Recarga só recupera recibo e não reconstrói corpo. Antes de nova decisão, releitura explícita atualiza a evidência preservando o formulário. Uma revisão resolvida por outro escritor não confirma a intenção anterior. 402 preserva leitura/formulário/sessão, sem repetição após pagamento. Retry-After é respeitado nas consultas e ações, com limites comuns de GET; mutations não recebem retry automático.

A recusa definitiva 422 não grava operação: libera o formulário preservado, consulta evidência atual e exige novo gesto para enviar outra decisão. 422 projeta somente `campo` seguro do protocolo público em rótulos locais; nunca `input/msg/ctx`, JSON bruto ou texto do provedor. 401 mantém o fluxo de reautenticação vigente. Saída/logout/troca abortam consultas, limpam cache e memória e descartam respostas antigas após parsing.

Foto opcional usa rota privada fixa por ID validado; nunca segue URL de resposta nem hash como autorização. Reutiliza limites raster/20 MiB, espaço reservado, carregamento por gesto, lazy loading, zoom/foco/Escape, revogação de Object URL e isolamento de sessão. Ausência segura não impede resolver pendência de conta.

## Provas obrigatórias

Unitários exercitam protocolo, precisão, filtros, família, escolha humana, CAS, escrita incerta, recibo, preservação de formulário e limpeza. Fixture exclusiva em `tests/fixtures/revisao/`, build separado `dist-revisao-fixture/`, sem entrada de sessão no aplicativo público. E2E verifica temas, teclado, confirmação, estados, reflow 320px e 390×844/1440×900 nos três browsers.

CI central executa o inventário obrigatório de 56 testes PostgreSQL de `test_reviews_db.py` com verificador de zero skips, além dos contratos anteriores. `test_revisao_contract.py` acrescenta seis jornadas reais SPA/API/emissor/banco: leitura com foto, conta sem foto e escolha explícita, conflito de tipster, Print materializado pelo serviço real, descarte, UUID anterior ao POST, commit com resposta perdida e GET de recuperação, sessão 401 e fila vazia. Entradas sintéticas não substituem evidências/respostas/recibos reais. Traces começam depois de autenticação/seed e são sanitizados; nenhuma rede/recurso/resultado secreto é publicado. Mantêm-se as provas anteriores, inclusive 402 e isolamento entre usuários na jornada central e os aceites backend de Revisão.

Revisão é carregada em chunk próprio, mantendo o budget inicial de 200.000 bytes gzip. A adição de seis jornadas reais e do inventário backend reserva 25 minutos por job central; não altera timeouts de pedidos/testes, número de testes, cobertura ou critérios de aprovação.

## Ajuste dos testes da árvore conjunta

A primeira CI apontou que os aceites de roundtrip ainda esperavam o head isolado r200review2026, embora a árvore fornecida possua o merge u200sandbox2026. Os testes agora exigem esse head exato; os guards de downgrade povoado continuam presentes. O inventário RLS inclui novamente sheet_sources/sheet_previews/sheet_confirmations e o total estrito de chaves BIGSERIAL distingue as 19 tabelas de identidade explícita, incluindo a nova review_operations. São seis arquivos de testes, sem remoção de asserts/aceites. Os 40 testes locais de migração/RLS, ruff, mypy e segurança das fixtures passaram. O schema continua byte a byte com o mesmo SHA-256; os gates PostgreSQL completos e as jornadas de SPA usam o novo pin juntos.

As provas de conta e de erro de rota no WebKit aguardam o término real da navegação ao emissor e a presença do erro inicial antes de recarregar. Depois do reload, continuam exigindo o status específico e o foco esperado. A prova de decodificação da foto consulta a propriedade naturalWidth pelo locator, preservando a CSP estrita.

O ambiente de aceitação registra seus próprios listeners e subprocessos antes do bootstrap, para liberá-los mesmo se a preparação falhar antes de entregar a fixture. Três testes de ciclo de vida verificam sockets reais antes/depois da inicialização e encerramento forçado de processo travado. Falhas continuam propagadas, sem repetição de cenário, skips ou alteração das jornadas obrigatórias.
