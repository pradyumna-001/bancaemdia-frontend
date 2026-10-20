# Desempenho e acessibilidade — #37

## Estado da validação

Os resultados autenticados pertencem aos JSON do SHA frontend produzidos por
`performance-contract.yml`: consultar inventário, versões e todas as amostras,
junto ao estado dos checks da PR. A configuração de medição por si só não aprova
release. Este computador não possui Docker; PostgreSQL, emissor e API descartáveis
rodam na CI.

A ferramenta nativa interrompeu as tentativas no Chrome por não conseguir
identificar a URL com segurança, inclusive após a página local ser aberta pelo
titular. Nenhum zoom ou uso de leitor foi concluído ou contabilizado nessas
tentativas. As provas automatizadas e seus limites assistivos ficam separados;
não substituem um ensaio manual não realizado.

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

Lazy loading de páginas, subconjuntos locais de Source Sans 3, UTF-8 antes do tema
e gzip estático preservam funcionalidades e contratos. O build local inicial da
#37 mediu 115.380 bytes gzip. Esse valor precisa ser confirmado no commit final.
Os subconjuntos somam 106.712 bytes, preservando originais, licença, contornos,
avanços e recursos tabulares. Não houve biblioteca de gráficos ou cálculo financeiro
adicionado ao cliente.

## Interações e limites assistivos

Event Timing observa cliques reais nas duas visualizações de 100 apostas, com
CPU 4× e rede 150 ms/200.000 bytes/s no Chromium. Com suporte à API confirmado,
`maxDurationMs=null` com zero entradas indica observações abaixo do limiar de
16 ms, nunca latência zero. `supported=false` indica ausência da medição, sem
inferir latência. Suporte nativo de cada browser é registrado.
As outras verificações de navegação, teclado, foco, gráficos e mídia continuam
obrigatórias nos três browsers. TBT Lighthouse permanece outra métrica.

Axe, contraste, árvore de acessibilidade em memória e teclado não certificam toda
a experiência com leitor de tela. Ensaios manuais de zoom/leitor, ferramentas e
limitações precisam ser registrados separadamente. Não houve teste com participantes
nem coletor em produção; não se afirma P75 de INP em campo. Publicação continua
bloqueada pelo pin sandbox e pelos aceites administrativos de #38/#39.

Referências técnicas: [Lighthouse autenticado](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md),
[INP e Event Timing](https://web.dev/articles/inp),
[FontTools subset](https://fonttools.readthedocs.io/en/stable/subset/index.html) e
[OFL e nomes reservados](https://openfontlicense.org/webfonts-and-reserved-font-names/).

Intents públicos de conta deixam de consultar identidade no carregamento. Não exibem dados privados; entrar/cadastrar/recuperar seguem o fluxo hospedado. Voltar ao site revalida sessão no guard real e preserva destino. Sessão, erros conhecidos, saída incerta e proteção das áreas privadas permanecem. A referência antiga de rede indisponível não é representativa desse novo comportamento.
