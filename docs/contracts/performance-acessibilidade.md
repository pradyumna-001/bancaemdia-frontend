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

O bootstrap autorizado por hash antecipa somente JS/CSS públicos da rota atual e
suas dependências estáticas, a partir dos nomes emitidos pelo build. Não lê query,
identidade ou dados e não executa páginas antes do guard. Caminhos fixos têm
precedência sobre parâmetros. Outras rotas continuam lazy; o budget inclui a
pior carga inicial com esses preloads, sem somar rotas alternativas nem omitir a
rota antecipada. Falha na dica mantém a carga normal e o tema funcionando.

CSS antecipado só se torna stylesheet após recebimento e após o parser registrar
os estilos de entrada, em ordem determinística. Se o carregador normal já pediu
esse estilo, a dica não o aplica outra vez. Erro ou atraso preserva o caminho
normal do Vite. Seletores reutilizáveis importam seu próprio CSS; abrir Caixa ou
Contas diretamente não depende de ter visitado outra página. A ajuda pública usa
o construtor puro de destino, separado dos descritores de validação da API.

A leitura de `config.json` pode começar durante o download do JS: sem cookie,
sem Referer e com o mesmo prazo de cinco segundos até receber o corpo completo.
Somente essa resposta pública é entregue uma vez ao carregador central, que
mantém a validação de status, MIME, campos e URL. Ausência da antecipação usa o
caminho normal; uma nova inicialização não reutiliza resposta consumida. Isso não
consulta identidade nem fornece sessão, CSRF ou acesso. Hints de assets também
omitem Referer; parâmetros de protocolo não são transmitidos por essas dicas.

Os headers de compressão são os do nginx estático e são verificados também no
container. O proxy do ensaio conserva bytes e políticas da API; compressão de
HTML/CSS/JS/SVG não inclui credenciais ou respostas JSON privadas.

A prontidão é capturada no fim da navegação medida, antes de a auditoria de cache
sair e voltar à página. O coletor herda integralmente o teste oficial de BFCache;
testes comparam todos os artefatos, auditorias, pesos e perfis originais. Não se
espera uma segunda navegação terminar para aprovar o placeholder da primeira.
Em Apostas, a prova também exige as cem linhas reais da página solicitada.
Erros de acesso ou fila no layout externo também reprovam a medição. O aviso
de READ_ONLY confirmado pelo servidor preserva o acesso de leitura e não é erro.

O status de acesso/fila ocupa espaço fixo no cabeçalho. O carregamento da rota,
lista e resumo reserva espaço, com reticências enquanto os valores não chegaram;
nenhum zero financeiro é fabricado. Casas decimais extensas continuam legíveis e
inteiras. Leitura não espera billing, e os avisos de erro/modo de leitura conservam
ações e mensagens. A regressão de apresentação libera as três respostas em ordens
separadas e verifica geometria nos três navegadores/dois viewports.

Painel, Caixa, Resultados, titulares, Análises e Telegram reservam a região da
resposta inicial para impedir que seções já visíveis saltem. Consulta de billing
em andamento não é apresentada como recusa de escrita; controles continuam
bloqueados e avisos confirmados permanecem. Formatadores reutilizam somente
configurações de Intl, nunca valores, nomes ou resultados privados. O cache de
fusos é limitado e a precisão textual do dinheiro permanece a mesma.

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
Diagnóstico HTTP contém somente status e contagens numéricas, sem endpoint,
cabeçalhos, mensagens ou corpo, e não transforma falha de prontidão em aprovação.
Gate de privacidade é independente do aceite numérico: um diagnóstico abaixo da
meta pode ser publicado se tiver somente os campos permitidos, mas reprova o job.
Campos adicionais, browser/perfil/pin incorretos, duplicação e ausência bloqueiam
aprovação. Não publicar JUnit bruto da execução autenticada como substituto.

## Acessibilidade e responsividade

A matriz funcional conserva os três browsers/dois viewports e os gates anteriores.
Revisão adicional usa população grande, dois temas, teclado/foco, reflow, ampliação,
nomes/papéis/ordem de leitura e alternativa tabular. Espaço da mídia é reservado
antes dos bytes, com carregamento por gesto e ampliação acessível.

O percurso de teclado conta apenas paradas efetivas: conteúdo de details/dialog
fechados, fieldsets desabilitados e regiões inert não são controles disponíveis.
Grupo de rádios tem uma parada. Pontos SVG precisam do anel de foco desenhado
opaco de pelo menos três pixels; uma sombra decorativa não comprova foco.

Event Timing observa gestos de navegador em jornadas com API real; latência até o
próximo paint e tempo até concluir a tarefa são conceitos separados. Registro
abaixo da resolução da API não vira zero. Não usar relógio alterado, TBT ou evento
JavaScript não confiável como medição de interação humana. Não há coletor de
telemetria no produto ou prova de P75 de campo neste sandbox.

O relatório de validação registra quais ferramentas assistivas e ampliações foram
de fato ensaiadas, ambiente, limitações e participantes, se houver. Axe, Lighthouse
e árvore de acessibilidade não certificam por si sós usabilidade ou WCAG integral.

Em 20/10/2026, o titular confirmou a legibilidade no ensaio de zoom 200%/400% da
demonstração de Apostas e dispensou explicitamente o ensaio manual com Narrador.
O ensaio dispensado não é contabilizado como executado nem bloqueia o aceite da
#37. Os gates automatizados assistivos e seus inventários permanecem integrais,
sem skips; não se afirma certificação de leitor de tela.

## Fontes e carregamento

Source Sans 3 conserva seus contornos, métricas, pesos e recursos numéricos. A
versão web otimizada usa nome interno distinto em respeito à OFL; os originais
completos permanecem no fallback. Origem, licença, versões da ferramenta e hashes
estão em `public/fontes/README.md` e `subsets.json`. A declaração UTF-8 precede o
tema dentro dos primeiros 1.024 bytes, e o tema continua antes dos estilos com o
mesmo texto autorizado por hash CSP. Não relaxar CSP para obter score.

A abertura sem consulta usa o estado interno `idle`, que não comprova sessão nem ausência dela e não permite capturar contexto privado. `checking` representa uma consulta efetivamente em andamento e mantém os controles bloqueados. Entrada hospedada não disputa renovação/saída pendente nem é enfileirada após sua conclusão. Um novo login explícito ainda cancela uma leitura anterior segura e descarta a resposta antiga; a proteção não converte esse resultado em identidade.
