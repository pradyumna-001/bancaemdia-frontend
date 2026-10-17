# Análises do Painel — #56

## Versão e direção visual

GET `/api/v1/painel/analises` e a evolução ampliada de GET `/api/v1/painel` já estão integrados em `b916f54331f14cf47a3800324bd61d8638043c06`, pela backend #158. A implementação preserva o pin sandbox único `86c82c9cd4e9cbb296a6e7991c06a8f3e5f3c7a7`, SHA-256 `f486d9af983fcea52a087ec78aefedbfd3e65bdf30bf237a8f5b124a473d1595`, 127 operações e todos os consumidores anteriores. Não há mudança de disponibilidade, união de schemas, merge ou autorização de deploy.

Propostas A (barras/tabela expansível) e B (tabela compacta) foram apresentadas em `tests/fixtures/analises-proposta/`, com 390×844 e 1440×900, reflow 320px e ambos os temas. O titular escolheu expressamente **A — Barras e tabela expansível** em 17/10/2026 antes da implementação. Geometria reutiliza `BarraExata`: comprimento proporcional ao lucro absoluto e espessura proporcional à raiz da quantidade; rótulos, sinal e valores ficam visíveis. Dias/horários usam matriz textual navegável; a cor não é a única informação.

Branch `feat/56-analises`, PR contra main. Código herdado da frontend #99 e antecedentes é separado do escopo da #56. Não depende da correção de confirmação de troca de conta da #53. As dependências já abertas permanecem sujeitas à integração/reconciliação administrativa antes da publicação.

## Escopo e população

- `/painel/analises` é rota filha protegida e carregada sob demanda; mantém Painel ativo e todos os query params ao navegar. Não adiciona aba principal. Links levam ao diário do Painel, Configurações e financeiro por conta/titular já existentes.
- Análises ao vivo aceitam somente período `7d|30d|90d|1y|all`, casa, tipster e mercado publicados pelo endpoint. Período inválido/duplicado usa 30d. IDs BIGINT válidos viajam como texto exato, sem conversão numérica; demais parâmetros inválidos seguem defaults seguros de `lerFiltros`. Controles e pílulas só alteram filtros por gesto.
- Grupo, banca, conta/titular, estado, origem, datas próprias, revisão e seleção de apagadas permanecem no endereço; a página informa que não são aplicados a esta população. Não simula um conjunto filtrando categorias retornadas. Visão canônica da API define seleção/exclusões e lucro liquidado conhecido, sem antecipar resultado de pendentes.
- Resumo, esportes, faixas de odds, quartis, matriz e progressão usam `total_filtrado` e categorias da mesma resposta. Não somar métricas para reconstruir totais. Categoria desconhecida/não aplicável é preservada. Quartis, limites, ROI, progressão, odd média e fator de lucro são decisões do servidor.
- Evolução de caixa é uma consulta separada por período e casa, explicitamente sem tipster/mercado e demais filtros. Movimentos não têm essas dimensões. Acumulados podem incluir o histórico anterior à janela, conforme API. Lucro, depósitos, saques, saldo e valores do período são campos separados; o navegador não reconstrói saldo nem acumulado. Banca é separada por identidade, incluindo não atribuída.
- Série de caixa permite escolher um dos quatro campos para ler o gráfico; escolha não secreta persiste em `caixa_serie` na URL, com padrão seguro para valor inválido/duplicado; tabela mantém todos. Null é Não informado, com interrupção da linha; não liga pontos através de saldo desconhecido. Zero confirmado continua zero. Capital ausente/não positivo não gera progressão zero/infinita.
- Janela civil de consulta permanece Brasília, enquanto `fuso_horario` da conta divide dias/turnos das análises. Não muda datas históricas ou formatador global. Configurações reutiliza `FusoPreferencia`; confirmação do PATCH invalida `['analises']`, sem replay da escrita. #57 reutilizará o mesmo recurso.

## Resiliência e segurança

Todas as operações da tela são GETs. READ_ONLY preserva leitura; não há escrita financeira, cobrança ou etapa de autorização de custo. Transporte, sessão, descarte após parsing, cancelamento e políticas de retry/Retry-After são os existentes. Prazo da página é compartilhado entre consultas; erro parcial preserva a seção válida e uma atualização que falha não apaga dados anteriores do mesmo recorte. Um filtro novo tem outra chave de consulta e não herda a resposta do recorte anterior.

Tipos e descritor de validação são gerados do documento integral já pinado. Campos numéricos legados fora da precisão segura e respostas inválidas falham de forma legível; não arredondam dinheiro. Nenhum shape de resposta é declarado localmente. Logout/troca desmonta a área por `privateEpoch` e respostas antigas não voltam ao novo contexto.

## Provas exigidas

Unitários: parâmetros suportados/preservados/inválidos, precisão, categorias repetidas, nulls, população explícita, separação de caixa, atualização/falha parcial, Retry-After e logout. UI E2E: dois viewports e três browsers, ambos os temas, tabela equivalente, teclado, mapa, reflow320, erro e proteção do build público.

Workflow próprio `analises-contract.yml` acrescenta seis jornadas SPA/API/PostgreSQL/emissor reais aos 66 casos existentes. Inventário exato exige dois viewports por browser, zero skips/falhas. Seed inclui resultados positivos/negativos, freebet, pendentes, esporte não informado, capital e depósito/saque; compara exibição com resposta real e prova isolamento, READ_ONLY, filtros preservados e logout/401. Traces começam depois da autenticação/seed, são sanitizados e verificados antes de upload. A confirmação de todos os checks deve ser registrada no SHA final; esta especificação não é evidência de execução aprovada.

Fixture funcional isolada em `tests/fixtures/analises/` e `dist-analises-fixture/`; a proposta visual tem build próprio. Não integra `dist`, não libera sessão por configuração pública/URL/storage e não substitui a prova com API real.
