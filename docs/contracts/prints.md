# Prints web — #25

## Contrato candidato e origem

Backend [#195](https://github.com/pradyumna-001/bancaemdia-api/pull/195), issue #194, HEAD `6db8964d11c471b47d15c08bd5d46d864623bb1e`: 28 checks aprovados. O consumidor usa uma única árvore real reconciliada `cf20de6862b1f155fbff19043f89f5f6db4c5cd2`, estendendo o sandbox da #23 com o código da #195. OpenAPI inteiro gerado pelo app: 105 operações, SHA-256 `310e0612597074367e48800de71e249defaf5624eca5b4c4d6f14341baac0281`. Nenhuma união de schemas. A origem e os SHAs estão em config/api-contract.json; sandbox_reconciliation continua impedindo publicação. Após integração administrativa, regenerar/revalidar todos os artefatos contra uma única main integrada.

PR frontend diretamente contra main, com #89 e suas dependências herdadas declaradas. O diff inclui a fundação, as telas e as provas anteriores porque não há PR empilhada; o escopo próprio da #25 é seleção/entrada/acompanhamento de prints, seus testes, contrato e revalidação. O merge continua com o administrador.

## Enviar e identidades

Enviar tem dois canais: Export do Telegram e Prints. `entrada=prints` escolhe o canal; filtros/fragmento continuam na URL, sem afirmar que filtram o processamento. A importação de Telegram preserva o contrato anterior. Nenhuma senha, token ou CSRF vai para URL/storage.

A seleção múltipla aceita JPEG/PNG/GIF/WebP não vazios, até 20 itens, 20 MiB por arquivo e 100 MiB por intenção. Esses limites publicados são conferências antecipadas; decodificação/MIME real/pixels/frames, quota, dedupe e finanças são decisões da API. A seleção inteira recusada mantém os arquivos anteriores. Arrastar é opcional; o input com label funciona por teclado e toque.

UUID de intenção e de cada item são registrados em `prints`/`item` **antes do POST**, permitindo reconciliar uma resposta perdida inclusive após reload. São identificadores aleatórios públicos de recursos, sem poder de autorização; o servidor sempre exige dono/sessão. Nomes, bytes, SHA local e Object URLs ficam somente em memória; não entram em URL, cache de queries, storage ou telemetria. Prévia reserva espaço e é lazy. Hash pode avisar imagem repetida na seleção, mas não recusa nem decide deduplicação. Remover da seleção é ação explícita; arquivos recebidos não são apagados por esse controle.

## Operações e recuperação

POST `/api/v1/prints/intencoes/{intent_id}/itens/{item_id}` faz um multipart com exatamente um `file`. Um gesto autoriza os itens selecionados; cada um recebe um único POST, sequencialmente. Uma recusa 400/413/422 deixa seguir os demais arquivos; rede/timeout/5xx/resposta ilegível/409/410 interrompem o lote para reconciliação. 429/402 preservam os arquivos restantes e encerram a intenção automática de escrita. Não repetir mutation por sessão, refresh, timeout, polling ou logout.

202 significa recebimento, nunca aposta criada. Status, outcome, resultados, progresso/null, retryable e attempt vêm da API. A lista conserva todos os itens locais, inclusive os recusados/não enviados. O GET de intenção agrega só recebidos, sem manifesto/selagem; não é usado para declarar toda a seleção enviada. Resultado desconhecido mostra **Conferir print**, exclusivamente GET do mesmo item. 404 pode significar ausência/alheio/expiração; não autoriza replay automático. Com bytes ainda em memória e consulta explícita de ausência, nova tentativa de entrada exige outro gesto e a mesma identidade. Depois de reload não há bytes para reenviar; escolher imagens de novo cria outra intenção explicitamente, sujeita à dedupe autoritativa.

POST do item + `/retry` só aparece para `status=failed`, `retryable=true` recebido da API. Um gesto envia UUID de retry e expected_attempt exato; nenhuma tentativa automática. Sucessos/aceitos/processando não são reenviados. Resposta perdida exige GET, que publica attempt/last_retry_id; conflitos/ineligibilidade/expiração não são tratados como sucesso. A API serializa alias/tentativas e aplica o teto de três. Novas escritas passam por can/run da #52, revalidando o estado comercial; 402 preserva sessão/arquivos/leitura.

GET de intenção observa os itens admitidos: primeiro imediato/1s, depois exponencial até 30s, máximo 300 consultas ou 15 minutos. Retry de GET segue os limites 500/503/429/rede da #10, respeita Retry-After e termina espera automática acima de 60s. Pausar/retomar consulta não cancela processamento. Erros e fim do limite têm recuperação explícita; resultado nulo nunca vira zero. Links de aposta/Revisão usam somente resultados publicados e mantêm filtros. Resolução de revisão sem aposta pertence à #28, usando a operação própria publicada pela #195; esta tela não resolve nem fabrica dados financeiros.

## Segurança e provas

GETs usam cookie e transporte central; mutations CSRF em memória. Toda operação captura contexto privado; aborto/limpeza e verificação após parsing descartam respostas de outra sessão. Sair/trocar usuário desmonta dados, cancela requests/timers e revoga Object URLs. Mudança da identidade na URL também limpa a seleção anterior. Guard inicial/RequireSession continuam obrigatórios; mudanças de query na mesma área Enviar não reexecutam o loader de sessão e não transformam navegação em replay.

Vitest cobre seleção/limites, UUIDs inválidos, respostas incompatíveis/nulos, dedupe auxiliar, multipart por item, falha parcial, reconciliação, acesso de leitura, versão de retry e limpeza/resposta tardia. E2E da fixture isolada prova temas, mobile/desktop, teclado, axe, 320px, preview e reload sem POST. O build público não contém simulador.

CI preserva 12 jornadas centrais, identidade/Telegram/foto e 139 invariantes backend anteriores. Acrescenta as 35 provas obrigatórias reais da #195 e seis jornadas públicas de prints (Chromium/Firefox/WebKit × mobile/desktop): cookie, API/PG/inbox/Redis/Celery reais, raster/cache de extração sintéticos, sem status/resultados/revisões/apostas semeados. Cache privado por usuário e armadilha local impedem extração paga. Traces começam após autenticação/preparação e são sanitizados como na #23; rede/recursos/resultados com segredos não são publicados. Prova obrigatória exige inventário exato e zero skips. Sandbox não é lançamento nem prova da qualidade de uma extração inédita por IA.
