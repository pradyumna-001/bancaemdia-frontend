# Configurações — #33

Contrato integrado: API `b916f54331f14cf47a3800324bd61d8638043c06`, OpenAPI SHA-256 `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a`. A alteração não incorpora o schema candidato da PR backend #184 e não depende da correção backend #186 da lista.

## Preferências com efeito real

`GET /api/v1/painel/preferencias` e `PATCH` do mesmo recurso retornam `FusoEntrada`, tipo gerado. O fuso pertence ao usuário, define os dias das análises e persiste na API. Não muda lançamentos, valores, vigências de unidade ou o formatador global de datas. `FusoPreferencia` é a implementação compartilhada a ser usada pela #57; não criar outro estado de preferência nessa tela.

O seletor próprio abre um diálogo modal com seleção rápida explicitamente identificada, busca do catálogo completo, opções de fuso, indicação textual da seleção, Escape e devolução do foco. O catálogo IANA do navegador evita uma lista incorporada ao bundle; o fallback inclui os fusos brasileiros e UTC. O fuso salvo válido, inclusive um alias, permanece acessível mesmo fora do catálogo. Resposta ausente/inválida não vira São Paulo nem UTC silenciosamente.

A aparência reutiliza `PreferenciaTema` e o controlador pré-pintura do ADR006. Só a preferência de tema fica em localStorage; fuso, identidade e CSRF não são persistidos pelo navegador. Storage bloqueado mantém funcionamento em memória.

## Sessão, acesso e falhas

GET seguro usa políticas finitas globais. Retry-After vale para todos os gatilhos desse recurso; consulta 404/405 não oferece repetição. Falha de atualização mantém o último fuso, identificado como consulta não atualizada, e bloqueia a gravação até nova consulta válida.

PATCH é uma intenção explícita, exige FULL_WRITE e nova conferência no servidor, CSRF e cookie. READ_ONLY mantém leitura, tema e links de conta; o servidor decide o acesso. Não há replay de PATCH, incluindo após renovação/pagamento. Timeout/rede/resposta inválida/409 exigem GET explícito antes de nova intenção. 402/422 conservam seleção; loc de 422 usa rótulo local e nunca input/msg/ctx. Resultado de PATCH válido alimenta o cache do mesmo recurso, sem prometer salvar antes da resposta. Cancelamento/desmontagem/sessão antiga descartam resultados, inclusive após parsing.

## Destinos e escopo

Conexões usa a implementação da PR frontend #79; Assinatura usa a #77 e seu retorno hospedado validado. Alterar senha usa intent recover já integrado, com destino interno de volta às Configurações e filtros preservados. Nenhuma senha/e-mail é editada aqui.

Privacidade tem destino próprio e indicação honesta de preparação; a exportação integral/encerramento pertencem à #58 e não são implementados nem declarados concluídos pela #33. A #33 não criou “Apagar tudo”; o reset reversível das apostas veio depois, pelo contrato próprio descrito abaixo (#124), e continua separado da exportação e do encerramento de conta. Formato de odd e troca de e-mail seguem bloqueados no planejamento por ausência de contrato de persistência, conforme aceite da #33; não aparecem como formulários funcionais. A unidade temporal ganhou contrato e está descrita abaixo (#123).

A PR é contra main e declara dependências frontend #69/#75/#76/#77/#79. O código herdado é identificado pelas árvores imutáveis #79 (57175ee6bd309a51c72ef540a0807f6f428762b6) e #77 (153fd3673d6f2ca0d8866df68a6929358726d3a9). O escopo próprio é Configurações/seletor/fuso, seus testes/fixture/contrato e a ligação dessa página nas rotas; a comparação à árvore #79 distingue a adoção de Assinatura e a entrega nova. Merge permanece com o administrador. Reconciliar as dependências quando integradas ou alteradas.

## Valor da unidade — #123

Contrato: `GET /api/v1/unidade`, `POST /api/v1/unidade/vigencias` e `GET /api/v1/unidade/vigencias/intencao` do pin de `config/api-contract.json` (API #214/#210), tipos `UnidadeSaida`, `VigenciaNova` e `ReciboVigenciaSaida` gerados. O cartão “Valor da unidade” mostra a vigência atual, a origem (padrão do serviço ou definida pelo usuário), o padrão, o limite e o histórico com início/fim no fuso publicado na própria resposta. Nenhum valor é estimado: os centavos chegam inteiros e o valor digitado em reais é convertido só por `centavosDaEntrada` de `format.ts`. Resposta fora do contrato (centavos não inteiros ou não positivos, vigente com fim, vigência do usuário sem `id`) é recusada, sem cair para um padrão.

A nova vigência é um gesto em duas etapas: revisar o valor (limite publicado pela API) e confirmar no diálogo, que diz de quanto para quanto muda e que vale a partir de agora. O servidor escolhe o instante; o recibo informa `vale_a_partir_de` e `apostas_existentes_alteradas`, e a tela só aceita recibo da origem `usuario`, sem fim, com o mesmo valor enviado e zero apostas alteradas. Apostas já registradas mantêm a unidade com que foram criadas; a Nova aposta mostra a unidade de agora e lembra que outra data usa a vigência do instante da aposta, sem converter valores.

O POST leva `Idempotency-Key` gerada antes do envio; chave e corpo ficam só em memória, sem URL/storage, e são descartados na saída/troca/logout. Não há replay automático. Rede, timeout ou resposta inválida deixam o resultado incerto e bloqueiam nova unidade até o gesto “Consultar resultado”, que chama o GET de intenção com a mesma chave: 200 mostra o recibo original; 404 diz que nada foi gravado com aquela tentativa e oferece reenviar a mesma chave e o mesmo corpo, ou descartar; outra falha continua incerta. 409 e 422 aparecem com texto local, sem `msg`/`input`/`ctx`. READ_ONLY consulta a unidade e o histórico, mas não altera; o servidor responde 402 sem efeito.

Provas: protocolo e recibo; cartão (vazio de histórico, histórico, fusos, limites, confirmação/Escape/foco, sucesso, incerteza, 404 com reenvio da mesma chave, 409/422, READ_ONLY); hook (envios concorrentes, estados, logout); dica da Nova aposta. E2E com fixture idempotente nos viewports. Jornada real `tests/identity/test_unidade_contract.py` (workflow “E2E unidade com API real”), nos três browsers e dois viewports, sem skips: troca pela SPA com chave, histórico e GET reais; perda da resposta após o commit, consulta da intenção sem novo POST; dica na Nova aposta com filtros preservados; dois temas, axe e 320 px; READ_ONLY só consulta; isolamento entre usuários; apostas existentes idênticas no banco.

## Apagar todas as apostas — #124

Contrato: `GET /api/v1/apostas/lotes/previa-apagar`, `POST /api/v1/apostas/lotes`, `GET /api/v1/apostas/lotes/{lote_id}`, `POST /api/v1/apostas/lotes/{lote_id}/restaurar` e `GET /api/v1/apostas/lotes/intencao` do pin (API #216/#212), tipos `PreviaSaida`, `LoteNovo`, `LoteSaida` e `IntencaoSaida` gerados. O cartão “Apagar todas as apostas” explica que as apostas ficam apagadas, não removidas, que a restauração é pelo lote e que caixa, contas, bancas, titulares, assinatura e conexões não mudam; exportar e encerrar a conta continuam em Privacidade (#58). Não promete apagar auditoria nem dados fora do contrato.

“Preparar exclusão” é um GET explícito da prévia (total, frase e validade publicados). A frase vem da API e é digitada pela pessoa, nunca preenchida; o botão só habilita com a mesma comparação publicada (pontas sem espaço, sem diferenciar maiúsculas) e o servidor decide. A validade é exibida, sem relógio local: prévia vencida, desatualizada, inválida, `nada_a_apagar` e `lote_em_curso` voltam com texto próprio, liberam a chave (recusas não são gravadas) e pedem nova prévia; `frase_incorreta` mantém a prévia. A 422 `lote_invalido` projeta só o nome do campo.

Identidades na URL, antes do POST: `lote_apagar` e `lote_restaurar` guardam a `Idempotency-Key` da tentativa; `lote` guarda o `lote_id` do recibo. Não são segredo nem autorização; valores inválidos são ignorados e links para outras áreas não os levam. O corpo do POST (confirmação assinada e frase) fica só em memória. Não há replay automático. Resultado incerto (rede, timeout, resposta fora do contrato, 5xx, 429) exige “Consultar resultado”, o GET da intenção com a mesma chave; só a resposta original de sucesso da mesma operação confirma. 404 diz que não há registro e não prova rollback: com o corpo em memória (ou, na restauração, com o lote na URL) é possível reenviar a mesma chave e o mesmo corpo por gesto; após recarga sem corpo, só descartar e preparar de novo.

O lote é relido pela API (`GET /lotes/{lote_id}`) e mostra apostas afetadas, criação e, quando houver, restauração. “Restaurar apostas deste lote” aparece enquanto `restaurado_em` for nulo, sem prazo inventado; `lote_restaurado` relê o lote. Depois de apagar ou restaurar, todas as outras leituras privadas são invalidadas, com aviso de que Painel, análises e saldo podem levar instantes para refletir. READ_ONLY consulta prévia e lote, sem apagar nem restaurar; o servidor responde 402 sem efeito.

Provas: protocolo (prévia, lote, intenção, frase); cartão e hook (chave na URL antes do POST, corpo exato, recibo, restauração, perda com consulta, 404 com reenvio da mesma chave/corpo, recarga só com chave, consulta falha, desatualizada, frase recusada, vazio, READ_ONLY, 402, lote desconhecido, parâmetros inválidos, restauração perdida, lote já restaurado, logout); E2E com fixture nos viewports. Jornada real `tests/identity/test_lote_contract.py` (workflow “E2E apagar apostas em lote com API real”), três browsers × dois viewports, sem skips: perda da resposta após o commit, recarga e consulta da intenção sem novo POST; apostas apagadas no banco e na lista, visíveis com apagadas; restauração exata ao estado anterior; isolamento entre usuários; caixa inalterado; dois temas, axe e 320 px; READ_ONLY.

## Provas

Unidade: protocolo IANA/aliases/fallback; seletor/busca/foco; sucesso, recusas, resposta desconhecida, atualização falha, prazo e logout tardio. E2E: 390×844/1440×900, dois temas, 320px, axe, teclado, armazenamento indisponível, filtros e build público contra o endereço da fixture. A demonstração fica só em tests/fixtures e dist-configuracoes-fixture, fora de dist.

A prova de identidade mantém os 12 casos anteriores e acrescenta dois casos (mobile/desktop) de preferência real na SPA pública: PATCH/GET com cookie/CSRF, reload, IANA inválido 422, CSRF ausente 403, isolamento entre usuários e expiração comercial com GET permitido/PATCH 402. O proxy da prova suporta PATCH; nenhum resultado ou sessão é injetado no bundle.
