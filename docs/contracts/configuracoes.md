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

Privacidade tem destino próprio e indicação honesta de preparação; a exportação integral/encerramento pertencem à #58 e não são implementados nem declarados concluídos pela #33. Nenhuma função “Apagar tudo” ou reset mantendo cadastro foi criada. Unidade temporal, formato de odd e troca de e-mail seguem bloqueados no planejamento por ausência de contrato de persistência, conforme aceite da #33; não aparecem como formulários funcionais.

A PR é contra main e declara dependências frontend #69/#75/#76/#77/#79. O código herdado é identificado pelas árvores imutáveis #79 (57175ee6bd309a51c72ef540a0807f6f428762b6) e #77 (153fd3673d6f2ca0d8866df68a6929358726d3a9). O escopo próprio é Configurações/seletor/fuso, seus testes/fixture/contrato e a ligação dessa página nas rotas; a comparação à árvore #79 distingue a adoção de Assinatura e a entrega nova. Merge permanece com o administrador. Reconciliar as dependências quando integradas ou alteradas.

## Provas

Unidade: protocolo IANA/aliases/fallback; seletor/busca/foco; sucesso, recusas, resposta desconhecida, atualização falha, prazo e logout tardio. E2E: 390×844/1440×900, dois temas, 320px, axe, teclado, armazenamento indisponível, filtros e build público contra o endereço da fixture. A demonstração fica só em tests/fixtures e dist-configuracoes-fixture, fora de dist.

A prova de identidade mantém os 12 casos anteriores e acrescenta dois casos (mobile/desktop) de preferência real na SPA pública: PATCH/GET com cookie/CSRF, reload, IANA inválido 422, CSRF ausente 403, isolamento entre usuários e expiração comercial com GET permitido/PATCH 402. O proxy da prova suporta PATCH; nenhum resultado ou sessão é injetado no bundle.
