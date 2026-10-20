# Desempenho e acessibilidade — #37

## Versão e população

O ensaio usa o build público do SHA frontend e a API única
`136f36094119edb09bea1343743c1c50ef460d93`, pin/hash de
`config/api-contract.json`. A dependência frontend é a #104, diretamente contra
main. A disponibilidade continua `sandbox_reconciliation`: integração
administrativa, revalidação e publicação têm aceites próprios.

O seed cria fatos sintéticos no PostgreSQL descartável: pelo menos 5.000 apostas,
40 tipsters/mercados/bancas/contas, 90 dias, metas, movimentos e pendências reais
das fixtures do servidor. Uma banca principal concentra metade das apostas e
abrange todos os 90 dias; as outras têm atividade ocasional e resultados variados,
sem correlacionar banca com um único estado. A SPA consome respostas reais; totais, saldo, lucro,
quartis e progressão continuam decididos pela API. O relatório obtém o total da
listagem real e registra apenas contagens da população. Cem apostas por página
exercitam as duas visualizações, preservando o conjunto/paginação publicados.

## Navegação fria e gates

`config/performance-routes.json` deve corresponder ao catálogo de rotas, incluindo
conta, ajuda, detalhes, mídia, formulários e áreas secundárias. Não substituir uma
página privada pelo login, por um fallback de carregamento ou por um erro estilizado.

Cada rota tem três amostras frias em 390×844 e 1440×900. Lighthouse 13.5.0 mantém
os perfis oficiais de CPU/rede mobile e desktop, com dimensões explícitas. Cada
amostra usa contexto incógnito novo e limpa o cache. Somente o cookie HttpOnly
obtido pelo emissor real é transportado em memória entre amostras privadas;
storage da aplicação não concede sessão. Retorno do emissor, refresh e Web Lock
continuam sendo operados pela SPA/API. Páginas públicas de ajuda e intents de conta não consultam identidade no carregamento. O gesto de entrada consulta a sessão antes de iniciar o fluxo hospedado, preservando erros de disponibilidade na própria tela. Consulta recusada não enfileira intent; troca de jornada descarta navegação pendente. Voltar ao site passa pelo guard real do destino. Erro/saída incerta já publicados em memória continuam bloqueando novo fluxo.

Todas as amostras exigem performance/acessibilidade/boas práticas >=95, LCP
estritamente menor que 2.500 ms e CLS estritamente menor que 0,1. Não arredondar
score abaixo da meta, escolher só a amostra rápida, remover caso ou substituir
ausência por zero. TBT é diagnóstico e não substitui INP. JS inicial permanece
<=200.000 bytes gzip; manifesto e tráfego devem preservar separação por rota.

Os headers de compressão são os do nginx estático e são verificados também no
container. O proxy do ensaio conserva bytes e políticas da API; compressão de
HTML/CSS/JS/SVG não inclui credenciais ou respostas JSON privadas.

A prontidão é capturada no fim da navegação medida, antes de a auditoria de cache
sair e voltar à página. O coletor herda integralmente o teste oficial de BFCache;
testes comparam todos os artefatos, auditorias, pesos e perfis originais. Não se
espera uma segunda navegação terminar para aprovar o placeholder da primeira.
Em Apostas, a prova também exige as cem linhas reais da página solicitada.

O status de acesso/fila ocupa espaço fixo no cabeçalho. O carregamento da rota,
lista e resumo reserva espaço, com reticências enquanto os valores não chegaram;
nenhum zero financeiro é fabricado. Casas decimais extensas continuam legíveis e
inteiras. Leitura não espera billing, e os avisos de erro/modo de leitura conservam
ações e mensagens. A regressão de apresentação libera as três respostas em ordens
separadas e verifica geometria nos três navegadores/dois viewports.

Coleta usa o mesmo listener HTTPS e certificado descartável verificado da sua
prova existente. A recusa de HTTP não é contornada por cabeçalhos inventados ou
validação TLS desabilitada. O processo pertence ao harness e é encerrado também
se a preparação falhar; somente a rota Coleta usa esse upstream.

## Relatórios e segurança

Lighthouse bruto inclui informações que não podem virar artefatos públicos.
Relatórios HTML/JSON completos, DOM, screenshots, DevTools logs, cookies,
cabeçalhos, payloads e URLs privadas não são gravados pelo ensaio autenticado.
Cookie não vai para argumentos, ambiente, URL, configuração pública ou storage.

O JSON permitido contém somente versões, perfil/ambiente, contagens, budget,
métricas numéricas, IDs estáticos de auditoria e resultados booleanos por rota.
Gate de privacidade é independente do aceite numérico: um diagnóstico abaixo da
meta pode ser publicado se tiver somente os campos permitidos, mas reprova o job.
Campos adicionais, browser/perfil/pin incorretos, duplicação e ausência bloqueiam
aprovação. Não publicar JUnit bruto da execução autenticada como substituto.

## Acessibilidade e responsividade

A matriz funcional conserva os três browsers/dois viewports e os gates anteriores.
Revisão adicional usa população grande, dois temas, teclado/foco, reflow, ampliação,
nomes/papéis/ordem de leitura e alternativa tabular. Espaço da mídia é reservado
antes dos bytes, com carregamento por gesto e ampliação acessível.

Event Timing observa gestos de navegador em jornadas com API real; latência até o
próximo paint e tempo até concluir a tarefa são conceitos separados. Registro
abaixo da resolução da API não vira zero. Não usar relógio alterado, TBT ou evento
JavaScript não confiável como medição de interação humana. Não há coletor de
telemetria no produto ou prova de P75 de campo neste sandbox.

O relatório de validação registra quais ferramentas assistivas e ampliações foram
de fato ensaiadas, ambiente, limitações e participantes, se houver. Axe, Lighthouse
e árvore de acessibilidade não certificam por si sós usabilidade ou WCAG integral.

## Fontes e carregamento

Source Sans 3 conserva seus contornos, métricas, pesos e recursos numéricos. A
versão web otimizada usa nome interno distinto em respeito à OFL; os originais
completos permanecem no fallback. Origem, licença, versões da ferramenta e hashes
estão em `public/fontes/README.md` e `subsets.json`. A declaração UTF-8 precede o
tema dentro dos primeiros 1.024 bytes, e o tema continua antes dos estilos com o
mesmo texto autorizado por hash CSP. Não relaxar CSP para obter score.

A abertura sem consulta usa o estado interno `idle`, que não comprova sessão nem ausência dela e não permite capturar contexto privado. `checking` representa uma consulta efetivamente em andamento e mantém os controles bloqueados. Entrada hospedada não disputa renovação/saída pendente nem é enfileirada após sua conclusão. Um novo login explícito ainda cancela uma leitura anterior segura e descarta a resposta antiga; a proteção não converte esse resultado em identidade.
