# Filtros na URL — #17

## Versão e integração em 08/10/2026

O usuário autorizou desenvolver a PR #74 diretamente contra main, declarando a dependência [backend #184](https://github.com/pradyumna-001/bancaemdia-api/pull/184), com merge reservado ao administrador. O pin desta branch é **candidato**, árvore única `9b42a3579518a84d348d272afbaeff88f9119825`, OpenAPI SHA-256 `ed837f9a47ea15e839c543412f9aee2bd9a90332ae0a54936c95235c6d432bd5`. `availability` em `config/api-contract.json` registra PR e baseline integrada `b916f54331f14cf47a3800324bd61d8638043c06`. Tipos e políticas vêm dos mesmos bytes oficiais verificados, sem união de schemas ou edição manual. Os 27 checks backend passaram nesse HEAD; isso não é merge nem deploy.

Depois do merge backend: validar commit integrado, obter seu hash, reconciliar o pin e regenerar ambos os arquivos. Remover `availability` somente nessa reconciliação. `pnpm check:contract-integration` falha para candidatos e verifica ancestralidade do pin na main backend antes de publicação. Nunca publicar este candidato. A antiga corrupção de JSON foi resolvida pela integração de #178/#181; não permanece bloqueio atual. Fonte: [contrato backend imutável](https://github.com/pradyumna-001/bancaemdia-api/blob/9b42a3579518a84d348d272afbaeff88f9119825/docs/contracts/site-filters.md).

#17 entrega codec, adapters, seletores e provedor autenticado reutilizáveis. As páginas de Apostas/Painel pertencem a #18/#20. Os exercícios existem somente em `tests/fixtures/`, builds separados, sem bypass no aplicativo público. Dependência #16/PR #69 reutiliza apenas `termos.ts` e seus testes; nenhum PR empilhado. A #50 mantém suas demais lacunas.

## URL e recursos

| URL                                | Parâmetro nos quatro recursos                          |
| ---------------------------------- | ------------------------------------------------------ |
| casa, tipster, mercado, competicao | casa_id, tipster_id, mercado_id, competicao_id         |
| titular, conta, grupo, banca       | titular_id, conta_casa_id, grupo_id, banca_id          |
| estado, origem                     | Mesmo nome                                             |
| revisao=0 ou 1                     | revisao_grave=false ou true                            |
| apagadas ausente ou 0              | visibilidade=ativas                                    |
| apagadas=1                         | visibilidade=apagadas, omitindo incluir_apagadas       |
| apagadas=todas                     | visibilidade=todas                                     |
| periodo                            | 7d, 30d, 90d, 1y ou all; sem padrão temporal implícito |
| desde, ate                         | Instantes ISO de fronteiras civis de São Paulo         |
| page, page_size                    | Somente lista; padrões 1/50, tamanho 1–100             |

Recursos: `/api/v1/apostas`, `/api/v1/painel/filtrado`, `/api/v1/painel/filtrado/metricas`, `/api/v1/painel/filtrado/export`. Os três agregados novos usam a seleção comum da lista, com fatos vivos. O Painel legado materializado continua distinto. `total_periodo`, lucro, ROI e valores desconhecidos pertencem ao servidor; null não vira zero. Contagens históricas e subconjunto financeiro elegível têm semânticas explícitas no contrato backend. Requests separados podem observar commits diferentes, mesmo aplicando filtros idênticos. Refetch não atualiza MV.

IDs seguem como strings decimais exatas até BIGINT máximo 9223372036854775807, inclusive 9007199254740993; sem conversão por Number. Zeros à esquerda normalizam. IDs sintaticamente inválidos, zero, acima do máximo, duplicatas conhecidas, estado/origem inválidos e datas impossíveis usam padrões antes da consulta. IDs válidos inexistentes/estrangeiros permanecem e recebem conjunto vazio; não se deduz exclusão pelo catálogo. Origem permite texto do contrato até 128 caracteres, sem controles; opções vêm da API, não de enum inventado.

Parâmetros desconhecidos permanecem como contexto da URL e não vão à API. Alterar/remover filtro reseta somente page e preserva page_size e os demais valores válidos. Navegação preserva a query; histórico, reload e pílulas usam a URL como fonte. A normalização só altera o endereço na próxima ação explícita. Cursor não é paginação alternativa.

Período junto com desde/ate, intervalo invertido e ate=9999-12-31 conservam os valores válidos e bloqueiam todos os GETs de dados até correção explícita. Sem período/datas, todo o histórico, inclusive sem data. `all` é uma opção temporal explícita com limite backend e não equivale à ausência de janela.

## Datas e seletores

Dias são civis em America/Sao_Paulo. Desde inclusivo vira o primeiro instante real do dia; ate inclusivo na UI vira início do dia seguinte, exclusivo na API. Intl/IANA cobre DST histórico e dias que não têm 24h. Calendário próprio: setas dia/semana, Home/End, PageUp/PageDown, nome completo da data e um dia no percurso Tab. Diálogos fecham por Escape e devolvem foco; fechar não altera a URL. Sem select/date nativos.

`FiltrosDaApi` consulta nove catálogos reais em `/api/v1/filtros/{dimensao}`: casas, tipsters, mercados, competicoes, origens, grupos, bancas, titulares, contas. Busca literal q, página com limites do servidor e resolução separada por id para filtros históricos/inativos fora da primeira página. A resolução por id não mistura q/página. Nome inativo recebe indicação textual. Falha de resolução conserva identificador e ação segura de consultar nome. Vazio 200, carregamento e indisponibilidade 503 são distintos; não se fabrica vazio.

O provedor usa sessão cookie, cliente tipado e leituras cercadas por época privada. QueryKeys incluem usuário/época, dimensão e busca ou id. Logout/troca desmontam filtros e limpam cache; respostas tardias não repovoam dados privados. Erros não exibem payload bruto. GETs seguem retry limitado global; Retry-After mantém a espera manual, inclusive acima de 60s sem reinício automático ao vencer. Busca/paginação ficam bloqueadas durante espera. Mutations não participam desses catálogos.

## Evidências obrigatórias

Vitest cobre os quatro adapters, BIGINT, normalização, datas/DST, visibilidades, conflito temporal, catálogos reais via transporte, paginação/busca, opção histórica, falha/recuperação, espera longa e limpeza de sessão. Playwright: três navegadores, mobile 390×844/desktop 1440×900, temas, axe, teclado/foco, reload/histórico, reflow320 e prova negativa das rotas de exercício no build público.

A CI de identidade preserva oito provas da SPA pública e exige mais duas do exercício autenticado com CSP própria, nos dois viewports, zero skips. API/issuer/e-mail/cookie/PostgreSQL/RLS reais: nove catálogos, grupo histórico BIGINT, filtros combinados, somente apagadas, página vazia com total preservado, resumo, métricas, XLSX e isolamento entre usuários/logout. Apenas entradas descartáveis são preparadas; resultados vêm do servidor. Esses dois casos não são prova de páginas públicas #18/#20, produção ou integração backend. A entrega da #17 requer todos os checks no SHA final; encerramento ocorre pelo merge frontend após reconciliação da dependência.
