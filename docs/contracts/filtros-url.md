# Filtros na URL — #17

## Capacidade e limites auditados em 06/10/2026

Contrato adotado: API integrada `bd055417459f796fed960b5b37efb33a9744419f`, SHA-256 em `config/api-contract.json`. Queries são os tipos gerados de `operations`; não há novos shapes de resposta. #17 fornece codec, adapters e componentes reutilizáveis. As páginas de Apostas/Painel e as consultas que os conectam pertencem às #18/#20; a rota de exercício fica exclusivamente em `tests/fixtures/`.

A main backend consultada `78b322ad7a2b27eae782d89404f85e7b30021864` incorporou identidade e conta/titular, mas seu [OpenAPI](https://github.com/pradyumna-001/bancaemdia-api/blob/78b322ad7a2b27eae782d89404f85e7b30021864/tests/contract/schemas/openapi.json#L2408) é JSON inválido: fechamento duplicado após `MatrizTitularSaida`. Não corrigir/concatenar o documento no cliente nem promover schema de PR. Manter o pin validado até a API publicar um artefato integrado válido e verificável.

O [GET de apostas dessa main](https://github.com/pradyumna-001/bancaemdia-api/blob/78b322ad7a2b27eae782d89404f85e7b30021864/src/bancaemdia/api/v1/apostas.py#L297) acrescenta titular/conta ao código. Não acrescenta somente apagadas/grupo/banca ao endpoint. O mesmo limite existe no PR backend #181 auditado em `ff9a0f0e81fe4e3765d0105654d4e98fdfeaf1f4`. Catálogos JWT para as demais dimensões, filtro somente apagadas e resumo equivalente continuam na #50. Código adicional de conta não equivale a um catálogo para todas as dimensões.

**Bloqueio de conclusão da #17:** a parcela frontend está revisável, mas a task de somente apagadas no servidor e a adoção de contratos/catálogos faltantes não estão concluídas. Não fechar a issue por esta preparação, declarar o conjunto disponível ou pular testes para aprovar release. Vincular a entrega concreta pela #50. Dependência de termos #16/PR #69: somente `termos.ts` e seus testes foram reutilizados; nenhum formatador ou branch empilhada.

## URL amigável e normalização

| URL                                  | Apostas no pin adotado                                                | Painel / métricas / exportação |
| ------------------------------------ | --------------------------------------------------------------------- | ------------------------------ |
| `casa`, `tipster`, `mercado`         | `casa_id`, `tipster_id`, `mercado_id`                                 | Mesmos nomes de API            |
| `competicao`                         | `competicao_id`                                                       | Preservado, não aplicado       |
| `estado`, `origem`                   | Mesmo campo                                                           | Preservado, não aplicado       |
| `revisao=0                           | 1`                                                                    | `revisao_grave=false           | true` | Preservado, não aplicado |
| `desde`, `ate` (dia civil ISO)       | Instantes do intervalo em São Paulo                                   | Preservado, não aplicado       |
| `periodo=7d                          | 30d                                                                   | 90d                            | 1y    | all`                     | Preservado, não aplicado | `periodo`, padrão `30d` |
| `apagadas=0` ou ausente              | Ativas; `incluir_apagadas=false`                                      | Preservado, não aplicado       |
| `apagadas=todas`                     | Ativas **e** apagadas; `incluir_apagadas=true`                        | Preservado, não aplicado       |
| `apagadas=1`                         | Somente apagadas: **bloqueia o GET**, não envia um conjunto diferente | Preservado, não aplicado       |
| `titular`, `conta`, `grupo`, `banca` | Preservados, indisponíveis no contrato adotado                        | Preservados, não aplicados     |
| `page`, `page_size`                  | Paginação real; limites/padrões gerados                               | Não são enviados ao agregado   |

IDs são textos de inteiros positivos na URL, normalizando zeros à esquerda sem arredondar BIGINT. Um ID válido que excede a precisão do tipo numérico gerado é preservado e **bloqueia o GET no recurso que o aplicaria**; dimensões indisponíveis continuam preservadas sem serem aplicadas. Não consultar outro ID nem eliminar filtro válido. Duplicatas de chave conhecida, IDs com sintaxe inválida/zero, estado desconhecido, origem vazia/com caracteres de controle, datas impossíveis e valores fora das opções usam os defaults antes da consulta. Origem é texto no contrato: preservar Unicode e pontuação válidos, sem inventar enum nem seguir URL. Página/tamanho vêm da política gerada (1/50, tamanho 1–100). Param desconhecido permanece na URL, mas nunca é repassado à API; `cursor` não cria paginação alternativa.

O parser devolve a URL normalizada sem navegar automaticamente. A interface informa parâmetros inválidos; a próxima ação explícita de filtro/página aplica a normalização. Alterar/remover filtro reseta somente `page`; preserva `page_size`, dimensões válidas e contexto desconhecido. Paginar conserva todos os filtros. URL permanece fonte da verdade, com push para histórico; Back/Forward e reload restauram a visão. Links entre áreas mantêm a query inteira, como já faz Shell.

Intervalo invertido conserva ambos os dias válidos e bloqueia a consulta até correção explícita. `ate=9999-12-31` também bloqueia: o dia seguinte excede o calendário aceito pela API. Um filtro válido recusado pela API/catálogo não é removido automaticamente; 401/402/422/429/503 seguem a #10.

## Fronteiras, controles e população

Dias da URL são civis no fuso **America/Sao_Paulo**. `desde` vira o primeiro instante real desse dia (inclusivo); `ate`, escolhido inclusivamente, vira o primeiro instante do dia seguinte (exclusivo na API). A busca por fronteira usa Intl/IANA, incluindo meia-noite inexistente/repetida no horário de verão antigo, sem supor dias de 24h. Atalhos Hoje/Ontem deslocam dias civis. O Painel mantém suas janelas civis próprias: não fingir que um intervalo personalizado da lista está aplicado ao agregado.

Pickers usam dialog e botões, sem select/input date nativos. Escape/Fechar não mudam filtro; fechar devolve foco ao acionador. Calendário usa um dia no percurso de Tab, setas ±dia/semana, Home/End e PageUp/PageDown, com nomes completos das datas. Pílulas removíveis preservam estado e indicam dimensões não aplicadas; remover é sempre explícito.

Catálogos chegam como **projeções de apresentação** fornecidas pela consumidora a partir de respostas autorizadas e geradas. Não são shapes de API nem listas padrão simuladas. Sem catálogo, carregando, erro ou vazio têm copy distinta; erro pode fornecer ação de recuperação. ID salvo cujo nome não foi obtido permanece como identificador/nome indisponível; não inferir exclusão ou permissão pelo catálogo. Estado usa a tabela única da #16; origem não oferece canais inventados. Não habilitar titular/conta/grupo/banca antes de suporte integrado adotado.

Os adapters de Painel, métricas e exportação compartilham o mesmo conjunto de params do contrato adotado. Lista é outra população quando possui estado/origem/revisão/datas/visibilidade/competição. `escopo` e `preservados` devem ser apresentados pela consumidora; não calcular ROI/totais nem preencher cabeçalho com dados de um agregado incompatível. QueryKeys das consumidoras incluem recurso, usuário/época privada e query normalizada (#11/ADR004).

## Evidência

Vitest cobre codec, invalidez/duplicatas, precisão de IDs, datas/fuso/DST, semântica bloqueada de apagadas, paginação, interação com controles, pílulas, contexto e histórico. Playwright verifica os componentes em três navegadores e dois viewports, temas, axe, teclado/foco/Escape, reload e reflow320; captura componentes em fixture isolada e prova que a rota não entra no build público.

Prova real existente de identidade, no sandbox único pinado: sessão hospedada e API/PostgreSQL reais nos dois viewports verificam filtro por estado, intervalo inclusivo/exclusivo, página vazia com total preservado, isolamento e `incluir_apagadas` antes/depois de exclusão/restauração de aposta descartável. Não prova catálogos ausentes, somente apagadas, população financeira equivalente ou nova main com OpenAPI inválido. Não é deploy.
