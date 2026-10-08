# Conexão Telegram — #54

## Versão e jornada

Contrato único integrado `b916f54331f14cf47a3800324bd61d8638043c06`, SHA-256 `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a`, conforme `config/api-contract.json`. A PR backend #162 já foi integrada. Não adotar o candidato de filtros #184 nesta entrega. Tipos de LinkStatusResponse, LinkCodeResponse e RevocationResponse vêm do OpenAPI, sem DTO manual.

`/configuracoes/conexoes` pertence a Configurações e fica dentro de RequireSession/Shell. Configurações e Enviar oferecem atalhos que preservam query params; isso não afirma aplicação desses filtros ao vínculo global da conta.

GET `/api/v1/telegram/link` mostra linked, linked_at, last_inbound_at e last_outbound_at. Datas vêm da API, com formatação central e fuso explícito America/Sao_Paulo. Null permanece “Não informado”; tráfego não é presença online. Não expor identidade/chat privados nem inferir usuário do Telegram.

POST `/api/v1/telegram/link-codes`, sem body, é uma intenção única com cookie/CSRF. O comando `/vincular CODIGO` existe somente em memória do componente. Não usar query cache, URL, storage, logs ou telemetria. Código de oito caracteres no alfabeto publicado, de uso único, vence em até 30 minutos; validade e consumo pertencem ao servidor. Copiar é ação explícita. O clipboard do dispositivo continua sob controle da pessoa: não prometer apagá-lo. Ocultar, sair, expirar e confirmar vínculo removem a apresentação. Consulta/troca de sessão descarta respostas antigas, inclusive depois do parsing.

Durante a conexão, apenas GET é observado: 5s nos primeiros 30s, depois 10s, máximo dois minutos, sem polling em background. Erro para a observação; retries de GET seguem a política central limitada. Consultar vínculo é ação explícita, respeitando Retry-After. Pausar não cancela processamento nem revoga código no servidor.

DELETE `/api/v1/telegram/link` exige confirmação, informa invalidação de códigos/rascunhos pendentes e preservação de apostas registradas. Confirmar DELETE não autoriza repetir caso a consulta subsequente falhe. Somente um GET atual confirmado instala a situação da conexão; uma revogação concorrente com novo vínculo não é exibida como desconectada por otimismo.

422 usa recuperação em português sem payload privado. 429 respeita o prazo publicado; sem prazo não inventar cooldown de emissão. Timeout, rede, 5xx/resposta ilegível e 409 não publicado bloqueiam a repetição da intenção. Consultar estado antes de preparar novo código, com confirmação de que a emissão invalida códigos anteriores. Nenhuma mutation é repetida automaticamente. READ_ONLY permite vínculo e revogação conforme as exceções publicadas da #52; não libera upload. Enviar revalida acesso e preserva arquivo recusado.

## Bot e lançamento

O dono confirmou que ainda não existe endereço público e autorizou a entrega com essa pendência em 08/10/2026. A pedido dele, “Abrir bot do bancaemdia (link fictício)” aponta somente a `#telegram-bot-lancamento`, mantendo filtros, e explica que o endereço real será divulgado no lançamento. Não inventar username t.me nem encaminhar códigos a terceiros. Antes de liberar o canal em produção, publicar o endereço verificado e validar o percurso com o bot real.

A orientação explica foto única → rascunho → correção → confirmação dentro do Telegram. Não construir chat, mensagens privadas, rascunhos web, estados não publicados ou chamada ao Telegram pelo navegador. Enviar é a importação do histórico exportado, outro canal. Nenhuma estimativa/aviso ou autorização de gasto aparece.

## Provas e dependências

Vitest cobre parsing seguro, memória, foco, clipboard, expiração, polling finito, recusas, respostas ambíguas e descarte após logout/saída. E2E do build público usa respostas HTTP de teste e cobre os três browsers nos dois viewports, temas, teclado, axe e reflow 320px, com capturas. A demonstração `tests/fixtures/telegram/` usa build separado `dist-telegram-fixture/`; sessão e controle “Simular conexão no bot” nunca entram no dist público.

A prova comercial real de identidade, obrigatória mobile/desktop e sem skips, acrescenta emissão por SPA/cookie/CSRF sob READ_ONLY, expiração real no banco, consumo único, revogação por SPA, invalidação de código pendente e preservação da aposta. API pinada, PostgreSQL e serviço de vínculo são reais. Somente o transporte de entrada privado do Telegram é representado por IncomingCommand local; o segredo descartável do sandbox é fornecido ao mesmo serviço. Não semear vínculo final. Nenhuma conexão com Telegram externo, foto real, IA paga ou endereço público é validada por esse teste. O CI mantém as demais provas de identidade/importação; sandbox verde não é deploy.

PR independente contra main, sem merge administrativo. Herda formatação #16/PR #69, acesso/tipos/provas #52/PR #76 e importação/observador #24/PR #75 (inclui #15/PR #73 e decisão de gastos #50/PR #71). Os commits herdados precedem o commit próprio #54; reconciliar após integração ou alteração. Escopo próprio: página, parser, estado transitório, atalhos, consumidor de acesso em Enviar, fixtures consistentes com 402, prova Telegram, documentação e backlog. A futura #33 deve preservar o destino Conexões ao substituir Configurações.
