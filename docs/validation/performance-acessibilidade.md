# Desempenho e acessibilidade — #37

## Estado da validação

Os resultados autenticados pertencem aos JSON do SHA frontend produzidos por
`performance-contract.yml`: consultar inventário, versões e todas as amostras,
junto ao estado dos checks da PR. A configuração de medição por si só não aprova
release. Este computador não possui Docker; PostgreSQL, emissor e API descartáveis
rodam na CI.

A ferramenta nativa interrompeu o controle do Chrome por não conseguir confirmar
a URL com segurança. Em 20/10/2026, o titular fez o ensaio solicitado de zoom
200%/400% na demonstração isolada de Apostas e confirmou que tudo permanecia
normal e legível. Esse resultado é um relato do titular sobre apresentação com
dados simulados, separado das provas autenticadas com API real.

O titular dispensou explicitamente o ensaio manual com Narrador. Ele não foi
executado e não bloqueia o aceite da #37, conforme decisão no corpo canônico da
issue. As verificações automatizadas de teclado, foco, contraste, árvore de
acessibilidade e alternativas tabulares continuam obrigatórias, com inventário
completo nos três browsers/dois viewports e zero skips.

## Reprodução

1. Usar Node da `.node-version`, pnpm 10.34.6, Python 3.12 e dependências travadas.
2. `make install lint typecheck test build check:bundle`; fontes podem ser reproduzidas
   com `pip install -r scripts/font-requirements.txt` e `python scripts/subset-fonts.py`.
3. Executar os jobs de `.github/workflows/performance-contract.yml`, que fixam a árvore
   real da API, iniciam PostgreSQL/OIDC/Redis descartáveis e criam fatos sintéticos.
4. Conferir `performance-{mobile,desktop}.json` e os seis JSON de acessibilidade com
   `scripts/check-performance.mjs` e `scripts/check-accessibility.mjs` no mesmo SHA.
   Nenhum cookie, Lighthouse bruto ou URL privada deve ser salvo para reproduzir.

O catálogo é `config/performance-routes.json`. Perfis são os oficiais do Lighthouse
13.5.0, com viewport explícito. Cada amostra limpa cache e usa contexto novo; estado
de autenticação válido vem do servidor. Cada uma precisa atingir as metas; não se
usa mediana ou melhor execução. JSON diagnóstico abaixo da meta pode ser publicado
após auditoria de privacidade e continua reprovando o job.

## Referência e mudanças

O artefato da #36 registrou 198.305 bytes gzip de JS inicial; seu diagnóstico mobile
teve performance 69, acessibilidade 100, boas práticas 92, LCP 4.985 ms e CLS 0,126.
Incluía erro da API de identidade indisponível e não era aprovação de release.
A medição real da #37 substitui essa referência para os gates de release.

O diagnóstico inicial da #37 no SHA `7af29532a6be42ec24b98d6a4aee2a11e08041e8`
foi reprovado: 23 amostras desktop, com Apostas em performance 75, LCP 645 ms e
CLS 1,241 na primeira navegação. O inventário ficou incompleto e não aprova release.
O artefato auditado `12284474500` pertence ao run `39467166681`. Ele motivou reserva
de espaço no carregamento, status compacto no cabeçalho e resumo estável, sem
remover valores. A prontidão é agora lida antes da navegação extra do teste de
cache; o teste oficial permanece inteiro. A Coleta reutiliza seu listener HTTPS
verificado. Os novos resultados precisam ser conferidos no SHA final completo.

Lazy loading de páginas, subconjuntos locais de Source Sans 3, UTF-8 antes do tema
e gzip estático preservam funcionalidades e contratos. O build local inicial da
#37 mediu 115.380 bytes gzip. Esse valor precisa ser confirmado no commit final.
Os subconjuntos pré-carregados somam 38.592 bytes (49.296 com todo o Latin-1 na parte principal; 60.872 antes da divisão principal/complementar por `unicode-range`; 67.252 antes de expandir as sub-rotinas CFF), preservando originais, licença, contornos,
avanços e recursos tabulares. Não houve biblioteca de gráficos ou cálculo financeiro
adicionado ao cliente.

O diagnóstico local das correções de carregamento mediu 149.982 bytes gzip na
pior rota inicial, incluindo preloads, e 117.042 bytes na base comum. Passaram
48 casos selecionados em Chromium mobile/desktop e nove medições públicas
(três de Tutorial, três de Extensão e três de Entrar), todas com os três scores >=95,
LCP<2.500 ms e CLS<0,1. Esses dados locais não substituem os resultados
autenticados, o inventário completo ou os checks do SHA final.

A conferência local de 20/10/2026 passou em lint, tipos e 1.640 testes de 107
arquivos, sem falhas ou skips. O build seguinte mediu 150.166 bytes gzip na pior
rota inicial e 117.010 na base comum. Com os subconjuntos menores, nove novas
amostras públicas atingiram performance 98–99, acessibilidade/boas práticas 100,
LCP entre 2.008 e 2.272 ms e CLS 0,029 ou menor. Continuam sendo diagnóstico
local, separado das 192 amostras autenticadas exigidas no SHA da PR.

## Interações e limites assistivos

A rodada de `8b7127c` não foi aprovada: incluiu 401 de acesso durante a medição,
falha de inventário após seed, foco de seletores/fixture e preparação de processo.
Esses resultados não contam como evidência de aprovação. A preparação da medição
passa a renovar o acesso real de 30 segundos antes de cada navegação privada,
sem ampliar sua validade, aquecer JS da SPA ou repetir amostras. O teste de
interação aguarda o resultado da navegação dentro do prazo original; foco após
fechamento atrasado de picker respeita o próximo gesto. O commit final deve
executar novamente todos os gates, inclusive jornadas anteriores.

Event Timing observa cliques reais nas duas visualizações de 100 apostas, com
CPU 4× e rede 150 ms/200.000 bytes/s no Chromium. Com suporte à API confirmado,
`maxDurationMs=null` com zero entradas indica observações abaixo do limiar de
16 ms, nunca latência zero. `supported=false` indica ausência da medição, sem
inferir latência. Suporte nativo de cada browser é registrado.
As outras verificações de navegação, teclado, foco, gráficos e mídia continuam
obrigatórias nos três browsers. TBT Lighthouse permanece outra métrica.

Axe, contraste, árvore de acessibilidade em memória e teclado não certificam toda
a experiência com leitor de tela. Ensaios manuais de zoom/leitor, ferramentas e
limitações precisam ser registrados separadamente. Não houve estudo com participantes
nem coletor em produção; não se afirma P75 de INP em campo. Publicação continua
bloqueada pelo pin sandbox e pelos aceites administrativos de #38/#39.

Referências técnicas: [Lighthouse autenticado](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md),
[INP e Event Timing](https://web.dev/articles/inp),
[FontTools subset](https://fonttools.readthedocs.io/en/stable/subset/index.html) e
[OFL e nomes reservados](https://openfontlicense.org/webfonts-and-reserved-font-names/).

Intents públicos de conta deixam de consultar identidade no carregamento. Não exibem dados privados; entrar/cadastrar/recuperar seguem o fluxo hospedado. Voltar ao site revalida sessão no guard real e preserva destino. Sessão, erros conhecidos, saída incerta e proteção das áreas privadas permanecem. A referência antiga de rede indisponível não é representativa desse novo comportamento.
