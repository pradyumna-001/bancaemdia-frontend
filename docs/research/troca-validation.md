# Troca de conta — registro de validação #53

Versão de trabalho em 17/10/2026. A entrega só é pronta após os checks do SHA final.

## Escopo

Árvore real da API 5f5f06276114d35e062db45bc54c61c4cb6fc3ec, OpenAPI inteiro com 128 operações e hash 922f9d278a650fa047eb4dcfb933712d25bab9a529ca6bb881dfc6daf8ca108d. Candidato backend #207, 132ee915, 26 checks verdes conferidos. Main b916f54 e fontes anteriores preservadas; sandbox não equivale a publicação. Escopo próprio frontend: /contas/trocar, confirmação, consulta de intenção, descritores gerados, provas e documentação; frontend #100/#99 e antecedentes são herdados, base main.

## Inventários

- Unidade: protocolo com datas/fuso/recibos e comparação do corpo, duas fases, chave/corpo imutáveis, duplo gesto, descarte após saída, falha de transporte/resposta inválida, stale/expired/422, reenvio explícito e consulta manual em READ_ONLY. Nenhum storage da intenção.
- Interface: quatro casos em cada um dos seis projetos (24 execuções), ambos os temas, teclado/foco/Escape, reflow 320, filtros, prévia/sucesso, resposta perdida e consulta manual após recarga, conflito/nova identidade, leitura e Retry-After.
- Real: tests/identity/test_troca_contract.py acrescenta seis jornadas públicas com emissor/API/PostgreSQL. Inserção concorrente após prévia resulta em 409 sem vigência parcial; nova prévia exige confirmação; resposta real de APPLY perdida é consultada após recarga/expiração comercial natural, sem reconstruir corpo/replay; atribuições anteriores permanecem, fronteira T na API, isolamento e logout/401. Traces começam após autenticação/seed e são sanitizados antes de upload.
- API: 34 aceites congelados de tests/integration/test_troca_confirmacao_db.py, validados pelo gate original no pin completo. Inventários centrais, entrada, coleta, análises e identidade anteriores continuam obrigatórios na mesma árvore. Falta/duplicata/skip/falha bloqueiam os gates.

## Limites

Teste com fixture comprova apresentação e não disponibilidade. Códigos 401/402/409/410/422/429/503 e concorrência profunda são também cobertos no inventário HTTP/PostgreSQL; não atribuir todos a uma jornada visual. O código de consulta precisa ser guardado pelo usuário antes da recarga: o contrato exclui URL e as regras de sessão não autorizam persistência da intenção. Consulta sem recibo não prova rollback. Nenhum teste autoriza merge/deploy ou promoção do sandbox.

## Verificação local

`make lint typecheck test TEST_ARGS=--maxWorkers=2`: 1.354 testes/89 arquivos aprovados. A execução inicial com 11 processos apresentou timeouts de 5s neste Windows; os limites e casos foram preservados e a suíte inteira passou com dois processos. Após a revisão de 402, mais 44 testes focados passaram, incluindo 22 do fluxo e 22 da recuperação de erros. Cobertura dos três arquivos novos: protocolo 100%; hook 99,50% statements/lines, 93,39% branches, 100% funções; página 97,41% statements/lines, 86,25% branches, 95,65% funções. O CI continua exigindo cobertura global por arquivo.

Interface: 24 execuções aprovadas nos seis projetos, ambos os temas, sem alteração dos timeouts de 30s/asserções. A primeira demonstração tinha estado compartilhado entre contextos: o servidor exclusivo da fixture passou a separar cenários por cookie HttpOnly de demonstração no endpoint de sessão. A configuração pública permanece sem credenciais. Traces e logs das falhas foram preservados. O aplicativo público não contém esse servidor nem uma forma de injetar sessão.

Capturas locais de formulário/prévia foram inspecionadas em 390×844 e 1440×900; a verificação adicional de 320px coube sem rolagem horizontal nos dois temas. Source Sans 3 local confirmada. Campos obrigatórios usam Escolher conta/data/estado, sem copy de filtro no formulário. Escopo da casa do recibo é explícito mesmo com outro filtro na URL; confirmação inicial foca Agora não, Escape devolve o foco e sucesso foca o resultado. Região de IDs rolável tem nome e foco para leitura por teclado, seguindo a mesma exceção pontual de lint já usada na tabela das evoluções; os gates globais permanecem intactos.

Build público local final: 196.559 bytes gzip, dentro de 200.000; CI mede novamente a versão final. CSP é gerada junto do build. Ruff/format dos 30 arquivos Python passaram; fontes e tipos foram gerados do hash único verificado.

O CI da PR registra o SHA efetivamente validado, os 34 aceites e seis jornadas novas reais, os inventários anteriores e os artefatos sanitizados. Falhas ou pendências não contam como aprovação. Resultados completos e links dos runs ficam na descrição da PR, atualizada após a execução, sem converter sandbox em publicação.

Primeiro CI bf60bdef: os 34 aceites HTTP/PostgreSQL passaram com gate original, zero skips/falhas/omissões. A jornada nova parou antes da seleção por um matcher de botão amplo que também encontrava Estado final da conta anterior; corrigido com prefixo completo, mantendo foco/teclado e todas as asserções. A revisão adicional do formulário cobre renovação da mesma sessão durante a validação comercial antes do POST: identidade não enviada é descartada, campos continuam disponíveis e nenhum envio ocorre sem novo gesto. Os 23 testes do fluxo passaram com cobertura de todos os arquivos novos >=80% nas quatro métricas; o CI completo precisa validar novamente o novo SHA.

CI 0268705 avançou até o conflito, mas o botão de nova prévia ficou corretamente bloqueado pelo Retry-After injetado pelo middleware em 409. A prova passa a capturar a resposta real, exigir swap_preview_stale, aguardar integralmente esse prazo e consultar a mesma identidade antes da nova prévia. Sem mudança de limite, relógio ou timeout de ação (30s). A UI explica a pausa e mantém a renovação conhecida após GET/PREVIEW, sem tratar APPLIED como prévia recusada. Logs e artefatos anteriores permanecem preservados; o novo SHA exige novamente todos os checks.

O driver aguarda controle habilitado/focado antes do teclado e diálogo visível antes de escolher, preservando os limites existentes. A perda de resposta usa o hook já existente do proxy, depois de receber o HTTP 200 real da API, sem refazer a requisição pelo navegador de testes. Exigir um único 200 e uma única chave observada continua obrigatório. Evita callbacks pendentes de Route.fetch no fechamento e não inclui cookies/CSRF em diagnósticos. Captura de falha mascara somente código de consulta e seu campo; os traces mantêm o gate de sanitização original.
