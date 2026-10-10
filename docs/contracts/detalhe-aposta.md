# Detalhe da aposta — #19

## Contrato e revisão

PR independente contra main, dependente da lista #18/PR #81 (`781ba2abf115fa48eb0c47a6bc0c4ddaa8a5bb94`) e da correção de acesso #82/PR #83 (`1efe758cf0bbfa3be7815a56171c2e0ad94837d6`). O merge pertence ao administrador. Dependências anteriores de #81 continuam declaradas: frontend #74/#80 e sua linhagem #69/#73/#76/#77/#79; backend #186/PR #187 e #183/PR #184.

Tipos e descritores públicos usam exclusivamente o documento inteiro de #187, commit `186be7482437eb5dd4b70914843dc6c5f90395f1`, SHA-256 `fc0e3ee8f02d5bcc11822c14979f9a3f6702d7e8bafb3c0df8fd30b1ac6c5699`. Não há união com #184: seu documento/build/prova real permanecem separados. GET/PATCH/DELETE da aposta, restauração, resultado, titulares/matrizes e Revisão já existem na base integrada b916f54. Matching/consolidação #109/#110 também estão integrados; as decisões avançadas serão consumidas pela #28.

O gerador acrescenta validadores publicados de detalhe e respostas de escrita ao mesmo snapshot. Objetos de rascunho são estado de apresentação; shapes de domínio vêm de `components`. Gate de publicação continua recusando candidata aberta. Após merges, reconciliar dependências e regenerar todos os artefatos de uma única versão oficial integrada.

## Navegação, leitura e valores

Link no evento abre `/aposta/:chave` com filtros/paginação/apresentação intactos. Nenhum GET de detalhe ocorre por linha. Voltar usa a mesma query e âncora da aposta; foco retorna ao evento depois do foco geral do Shell. A área de toque do link ocupa o contexto sem aumentar a linha compacta.

Cabeçalho, valor de face/custo, retorno, lucro, odd, unidades, datas, seleções, conta/titular e banca são projeções do servidor. Null não vira zero; freebet conserva a face. Referências históricas são distintas dos nomes atuais. `fonte_contextual` explica o papel da fonte; estados active/unlinked/rejected traduzem o histórico, sem somar, ocultar fontes ou decidir consolidação no cliente.

GET seguro usa recuperação central, backoff limitado e Retry-After; falha não remove dados já consultados. 404/405 não oferecem repetição. READ_ONLY preserva a consulta e bloqueia correção, resultado, atribuição e decisões.

## Escrita e concorrência

Formulário mantém baseline e rascunho. Envia somente campos realmente alterados da allowlist: evento, descrição, mercado bruto, casa, odd, unidades, comissão, datas e freebet. Omitido preserva; vazio vira null apenas em campos publicados anuláveis. Comissão/Cashout são valores informados pelo usuário, convertidos para centavos inteiros exclusivamente no formatador central; nenhum lucro/custo/retorno é calculado. Datas usam texto com dia/mês/ano, hora e offset explícito, validação civil, sem date/select nativo. Resultado usa POST dedicado, com valor pago obrigatório para Cashout.

Cada intenção revalida billing e identidade. Escritas não recebem retry; duplo envio é bloqueado. Confirmar exclusão/restauração/revisão tem foco inicial em Agora não. Resposta válida confirma gravação, invalida leituras relacionadas e consulta detalhe; não promete refresh instantâneo de materialized views.

409, falha de rede/servidor e resposta inválida bloqueiam novas escritas até consulta GET explícita do estado. Consulta nunca repete a escrita; rascunho fica preservado para revisão. 402 conserva rascunho e sessão; 422 usa labels locais e projeção segura, sem payload/msg/ctx. 404/405 de escrita encerram aquela disponibilidade, sem nova tentativa oferecida. Falha de refetch após sucesso exige consulta explícita. Logout/troca cancela e descarta callbacks antigos.

## Conta, Revisão e mídia

Picker próprio consulta titulares com arquivados e a matriz do titular escolhido, com paginação/erros/vazio. Nenhuma primeira conta é escolhida automaticamente. Inativas e usos históricos continuam visíveis. Escolha envia apenas conta_casa_id ou null; API valida referência explícita, usuário/casa e temporalidade (data do jogo por padrão, sem substituir por data da aposta). CRUD/gestão de titulares/contas é #32.

Pendência legada lê a Revisão publicada e a chave parceira somente de campo autorizado; MESMA e CORRIGIR (distinta) exigem confirmação e usam resolver existente. Outra aposta abre em aba interna preservando query. Eventos exibem tradução e campos de allowlist, nunca JSON bruto ou metadados secretos.

Foto só existe para revisão aberta autorizada: GET privado por ID, gesto explícito, JPEG/PNG/WebP/GIF não vazios, espaço reservado e lazy loading. URL externa de resposta não é usada. Blob fica fora do cache; registro de limpeza aborta request e revoga URL ao sair/logout. CSP autoriza `blob:` exclusivamente em `img-src` para esse raster local; scripts, conexões, frames e demais diretivas mantêm política restrita. E2E aplica a CSP gerada do mesmo HTML e confirma imagem decodificada sem violação. Foto após resolução ou mídia genérica por hash continuam lacuna #22.

## Validação

44 testes unitários específicos cobrem protocolo, omissão/null, datas/centavos, referências históricas, 402/409/422/404/405/503, escrita incerta, limpeza de sessão e mídia. Cada arquivo do detalhe excede 80% nas quatro métricas; CI mantém cobertura global por arquivo sem exceções.

Seis jornadas E2E em mobile/desktop cobrem lista densa, filtro/âncora/foco, Claro/Escuro/axe, reflow 320px, correção, confirmação, conta histórica, recuperação, leitura, par legado/Cashout e foto sob CSP. Capturas ficam nos artefatos do teste. A prova pública com PostgreSQL/cookie/CSRF reais na árvore inteira #187 verifica edição pela SPA (corpo exato e preservação de campos), atribuição explícita, histórico, exclusão/restauração e freebet; permanece dentro da jornada operacional existente, com zero skips. Filtros #184 são uma prova separada; não se afirma deploy conjunto.

Fixtures com 30 apostas ficam exclusivamente em tests/fixtures e dist-apostas-fixture. Preview simulado é rotulado e descartável. Publicar apenas dist/CSP do mesmo SHA, após integração e gates. PR só é entregue fora de rascunho com todos os checks do SHA final verdes.
