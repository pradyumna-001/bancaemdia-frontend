# Primeiro uso — #59

`/inicio` é um guia opcional e protegido, acessível em Mais, Configurações e no vazio de Apostas. Sair não escreve domínio; voltar consulta novamente. A sessão confirma acesso à conta, não prova que um cadastro acabou de acontecer nem ativa assinatura. Nenhum endpoint de onboarding ou booleano local é presumido.

O pin vigente continua `5f5f06276114d35e062db45bc54c61c4cb6fc3ec`, OpenAPI SHA-256 `922f9d278a650fa047eb4dcfb933712d25bab9a529ca6bb881dfc6daf8ca108d`, 128 operações. Sandbox reconciliado não é produção. Dependências frontend #12/#32/#24/#34/#51/#54/#52, entregues em PRs contra main, permanecem sujeitas ao administrador; esta entrega não faz merge nem altera pin.

## Evidências e escopo

- BillingStatusResponse do ProvedorAcesso distingue AWAITING_CARD, TRIALING, ACTIVE e restrições. Trial só é descrito como confirmado quando `trial_confirmed` é verdadeiro; datas são publicadas pelo servidor. A permissão de escrita depende de can(operation), nunca de data, status textual ou URL. As telas de destino revalidam antes de escrever.
- Três GETs globais do proprietário, página 1/tamanho 1, usam totais da API para detectar presença: `/apostas?incluir_apagadas=true`, `/titulares?include_archived=true`, `/filtros/contas?incluir_inativas=true`. Não somar páginas ou finanças. Os três resultados não são um snapshot conjunto, nem comprovam conclusão de importação, intenção ou atribuição temporal. Dados de aposta, nomes e identidades recebidos não são apresentados pelo guia. A query é privada, cercada por SessionService.read inclusive após parsing; troca/logout cancelam/limpam conforme sessão existente.
- Falha de consulta não vira vazio nem sucesso. Resultado anterior não é usado para decidir o próximo passo após erro. GETs seguem política central de retry e Retry-After; consulta explícita indisponível durante prazo/consulta. 401 mantém guard; 402 mantém leitura/exportação e a assinatura separada da identidade.
- Conta inexistente sugere organizar titular/conta; cadastro não ativa vigência. Contas existentes podem estar inativas/encerradas/sem titular. A atribuição pelo dia do jogo e eventuais pendências são da API nas telas existentes. Explicação progressiva não força criar titular para canais que aceitam não atribuído.
- Nova aposta, export Telegram, planilha e prints usam telas/contratos existentes. READ_ONLY/estado comercial desconhecido oferece instruções, consulta e exportação; não apresenta link de envio como disponível. Bot permite preparar conexão READ_ONLY, mas o endereço público ainda está esperando lançamento (#54). Extensão continua sem artefato de release verificado (#35/extensão #16); não oferecer instalar ou inventar release.
- Todos os filtros permanecem nos links sem aplicação fictícia à consulta global. `entrada`/`guia` só mudam por escolha explícita do canal. Nova aposta usa novaApostaDestino canônico; não carrega intenção antiga. Não existe tour, percentual de conclusão, dinheiro fictício, senha local ou aprovação de custo.

## Medição e prova

As jornadas integradas registram duração e resultado de tarefa no JUnit e em relatório com chaves fixas de tarefa e sucesso/erro. Nenhum payload, valor financeiro, usuário, email, código, UUID de intenção, URL com identidade ou segredo entra no relatório. Não há coletor de telemetria de produto publicado: não inventar envio de eventos nem instalar analytics. Medição de laboratório não equivale a pesquisa com participantes ou estatística de produção.

Provar primeiro uso com conta vazia e cartão pendente, trial confirmado pelo servidor, falta de titular/conta, saída/retomada, canal indisponível, criação pela SPA e recibo autoritativo da mesma intenção. Reconsultar guia não substitui o recibo; leitura/erros/isolamento nos testes específicos. Três browsers × 390×844/1440×900, temas, reflow320, teclado/foco e axe. Fixtures de sessão somente em tests/fixtures e build separado, nunca dist público.
