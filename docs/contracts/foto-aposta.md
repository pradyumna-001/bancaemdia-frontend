# Foto original — frontend #22

## Versão e dependências

Backend [#192](https://github.com/pradyumna-001/bancaemdia-api/issues/192)/[PR #193](https://github.com/pradyumna-001/bancaemdia-api/pull/193), candidata `71f1a1acba17f2b99e8dcd55c25c672c98f43967`. OpenAPI inteiro SHA-256 `3e7703936f01da5d516441cb058509c913b6c954c352fdc4086c257d1000230c`, 90 operações. Tipos e políticas vêm dessa mesma árvore, não de concatenação de candidatos. A #193 não contém os endpoints/projeções de #184/#187/#189/#191. Não é versão integrada; o gate de publicação permanece.

PR independente contra main. Fundação frontend #80 e apresentação de conta #83 reaproveitadas; detalhe #19/#84 e Hipotética #21/#87 permanecem separados. Nenhuma tela aprovada dessas branches foi substituída. O visualizador `/aposta/:chave/foto` é protegido, mantém Apostas ativa e volta ao detalhe/à lista preservando query params. O detalhe #84 pode usar `<FotoAposta chave={a.chave} client={api} />` ou link para esse visualizador, mesmo sem hash e sem revisão aberta. Reconciliar esse ponto de consumo e um único pin integrado completo após os merges. Não manter a frase antiga de mídia sem rota na integração.

## Transporte e privacidade

`GET /api/v1/apostas/{chave}/foto`, segmento codificado, nenhuma query/corpo. Cookie HttpOnly; transporte existente sem Authorization/segredo em URL, cache no-store e redirect recusado. READ_ONLY é exceção explícita publicada. Hash não autoriza nem comprova presença. A API determina proveniência, retenção e acesso após resolução/apagar/restaurar. Bot pode perder a foto após retenção (7 dias padrão) ou unlink; a UI não promete disponibilidade permanente.

Bytes JPEG/PNG/GIF/WebP, até 20 MiB; MIME e integridade são validados pelo servidor. Cliente recusa tipo/vazio/tamanho inválidos e erro de decodificação. S3 e banco são acessados pelo backend; navegador não recebe URL assinada ou chave. Object URL só em memória do componente, fora de queries/storage/telemetria. Abort e revogação ao desmontar, trocar recurso/sessão ou logout; respostas tardias descartadas depois de parsing. CSP permite `blob:` apenas em `img-src`; scripts, conexões, objetos e frames seguem restritos.

Carregamento por gesto explícito, imagem lazy, espaço 4:3 reservado, object-fit contain, placeholder e retorno disponíveis mesmo em falha. Ampliação em dialog nativo modal com botão inicial, Tab contido, Escape e retorno de foco. A imagem não ganha descrição de conteúdo inventada.

404 é ausência segura indistinguível, sem retry nem diagnóstico interno. 422/405/403 não têm replay. 429/503 respeitam Retry-After, limites e backoff de `queryClient`; 500/rede/timeout até uma repetição, 503 até três, 429 até duas. Intervalo acima de 60s encerra automático e mantém embargo manual. Abortar cancela espera/timer. Sessão 401 segue serviço existente; imagem não controla billing ou escrita. Nenhum cálculo financeiro, extração, gasto ou alteração de fatos.

## Provas e integração

Vitest: gesto, código da chave, privacidade, ausência, inválida, foco, troca/logout/desmontagem, resposta tardia e retry. Playwright: três navegadores, 390×844/1440×900, contraste nos temas, reflow 320px, atraso/double click, recuperação, corrupção e build público contra origem da fixture. Demonstração e PNG sintético ficam somente em `tests/fixtures/midia`, output `dist-midia-fixture` separado.

Gate real usa API #193/PostgreSQL/RLS/emissor e SPA pública com CSP exata. Preserva 14 jornadas anteriores e acrescenta foto nos dois viewports (16 SPA + 9 backend, zero skips): bytes/dimensões reais, revisão do dono resolvida e antiga rota 404, READ_ONLY, dois usuários/404 indistinguível, snapshot financeiro inalterado e logout confirmado/401. Dados sintéticos são preparados apenas no banco descartável. As 42 provas backend de armazenamento/retenção/origens/segurança permanecem na #193; mock não substitui nenhuma delas. Prova de sandbox não é deploy.
