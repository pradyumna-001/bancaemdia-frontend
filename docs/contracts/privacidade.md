# Privacidade — frontend #58

## Contrato e escopo

GET `/api/v1/usuario/me/export?formato=json|xlsx` e DELETE `/api/v1/usuario/me` estão integrados na API main b916f54. O consumidor mantém o pin único sandbox 547a4d0 da frontend #94, sem gerar schema novo ou promover candidatas a main. Tipos do encerramento vêm de AnonymizeResponse gerado; exportação usa o binário do contrato. Nenhum cálculo financeiro, exclusão ou anonimização é realizado pela SPA.

O arquivo pessoal contém somente os registros disponíveis no endpoint: não equivale ao Excel financeiro do Painel, não aplica filtros de visualização e não inclui binários nem mensagens/fotos compartilhadas. Não afirmar exportação irrestrita de todas as tabelas nem exclusão total de auditoria. Eventos retidos podem perder o conteúdo original. A API pode recusar encerramento com 409, inclusive assinatura ativa ou fontes importadas que exigem exclusão assistida, sem alterar a conta. A tela apresenta ambos os caminhos sem interpretar detail bruto, inventar contato ou afirmar sucesso.

## Download privado

Download exige gesto explícito e preserva a sessão em READ_ONLY. Nome fixo seguro `meus-dados.json|xlsx`, MIME e conteúdo não vazio validados. Bytes não entram em queries, URL, storage ou telemetria. Object URL somente em memória, revogado após o clique inclusive em erro; aborto/limpeza na saída, troca e logout. Resposta antiga é descartada depois de parsing. Erros de GET e Retry-After usam a recuperação existente; nenhuma repetição automática de arquivo ou mutation. Query params são preservados nos links de retorno e assinatura, com escopo global do arquivo explícito.

## Encerramento

É exceção comercial explícita: acesso READ_ONLY não bloqueia o pedido, mas a API prevalece. Reutiliza can/run e cookie/CSRF da sessão. Diálogo tem foco inicial em manter conta, Escape, checkbox desmarcado e confirmação por gesto. Um envio por vez, sem replay. 409 preserva a conta; 401 reautentica; 402 não encerra a sessão nem repete a intenção depois de pagamento. Erro desconhecido bloqueia novo envio naquele fluxo. Consulta explícita da sessão não é recibo, nem prova apagamento ou rollback; não elimina o bloqueio. A perda do contexto da sessão não pode converter escrita incerta em nova intenção liberada.

Somente resposta tipada `status=anonymized` da mesma sessão confirma a conclusão. SessionService.accountClosed limpa provas em memória, cancela requests, limpa queries/mutations/recursos privados e envia apenas o evento de controle ended às outras abas. Não afirma logout no emissor externo ou remoção de cookie HttpOnly pelo JavaScript. A confirmação na tela Entrar é um sinal em memória da sessão, sem query, history state, storage ou grant. Uma nova sessão remove esse sinal; a rota protegida não preserva destino para uma conta com encerramento confirmado.

## Provas

Unitários cobrem READ_ONLY, formatos/MIME, nomes, campos de URL, limpeza, diálogo/foco, recusa, Retry-After, resultado desconhecido e respostas atrasadas. Fixture exclusiva `tests/fixtures/privacidade/`, build separado de dist; aplicativo público recusa a sessão simulada. E2E cobre temas, Axe, teclado, reflow 320px e 390×844/1440×900 nos três browsers.

O teste de rotas consulta o título atual até o fim do fallback lazy, sem manter uma referência ao nó provisório removido. Todas as rotas/assertivas anteriores permanecem, com verificação adicional de que o estado de abertura terminou; nenhum timeout ou retry é ampliado.

CI preserva as 42 jornadas reais anteriores e acrescenta seis de Privacidade: duas contas isoladas, exportação JSON/XLSX em READ_ONLY, CSRF, 409 real por marcador sintético de importação e encerramento confirmado sem afetar a outra conta. Dois aceites PostgreSQL existentes da API tornam-se inventário obrigatório com zero skips. Traces iniciam depois de autenticação/seed, sem rede/recursos/resultados secretos. Somente usuários e registros descartáveis dos testes são alterados. Publicação continua bloqueada pelo sandbox, com revalidação integrada antes de lançamento.
