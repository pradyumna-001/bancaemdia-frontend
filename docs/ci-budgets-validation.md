# Validação da issue #8

## Gates e escopo

CI permanente em push/PR preservada no SHA exato. Cobertura V8 >=80% por arquivo em lib/features (linhas, statements, funções, branches); inclui arquivos não importados. Budget de JS inicial <=200.000 bytes gzip, incluindo imports estáticos/preloads e tema inline, sem contar recurso compartilhado duas vezes. Lighthouse mede o build público, não a fixture de sessão.

`make lint typecheck test` passou com **241 testes em 16 arquivos**. `pnpm test:coverage` passou com 99,73% de linhas/statements, 97,34% de branches e 100% de funções no conjunto exigido; todos os arquivos superam 80% nas quatro métricas. O gate inicialmente reprovou SistemaPage por branches/funções: acrescentados testes de troca de cenário, limpeza de seleção, recuperação do vazio e valores extremos, sem excluir arquivos nem baixar limites.

O checker mede **98.652 bytes gzip (98,65 KB)** neste build. Testes negativos cobrem excesso, dependência/preload, import/arquivo ausente, script externo, escape de diretório e build sem entrada. A alternativa dinâmica não pré-carregada é separada da entrada e o compartilhamento é deduplicado.

## Referência Lighthouse local

Node 22.22.0, Lighthouse 13.5.0, Chromium headless shell do Playwright 1.63.0, Windows; uma execução fria por perfil. Página `/login` provisória, sem sessão/API real, servida pelo Vite preview com configuração pública válida. Perfis nativos do Lighthouse: mobile 412×823 e desktop 1350×940; a matriz funcional E2E continua 390×844/1440×900. O relatório confere `formFactor` e salva configuração, versão, agente e data.

| Perfil  | Performance | Acessibilidade | Boas práticas |     LCP |    CLS |  TBT |
| ------- | ----------: | -------------: | ------------: | ------: | -----: | ---: |
| Mobile  |          86 |            100 |            96 | 3912 ms | <0,001 | 0 ms |
| Desktop |          99 |            100 |            96 |  772 ms | <0,001 | 0 ms |

Performance/LCP mobile ficam abaixo da meta de release (>=95 / <2500ms). Isso está registrado para #37, que também ampliará a medição para páginas reais, repetições e jornadas. A #8 exige medição válida, não aplica o gate numérico final; não foi reduzida a meta. TBT não mede INP, e um run local não comprova P75 ou experiência de produção. Scores a11y não certificam WCAG completa. Vite preview não substitui a verificação de headers/CSP no nginx real, mantida no CI Docker.

Um ensaio inicial rotulou a segunda execução como desktop embora o preset de CLI fosse ignorado pela API Node. Essa evidência foi descartada. A versão entregue usa a configuração oficial de desktop e falha se o perfil efetivo divergir. No Windows desta estação, o Chromium completo não inicia com chrome-launcher; a medição foi reproduzida com `CHROME_PATH` apontando ao headless shell instalado. CI Linux usa o Chromium instalado pelo Playwright. O override só escolhe o executável local, não altera o perfil ou limites.

## Reprodução e artifacts

```sh
make install
make lint typecheck test:coverage build check:bundle
pnpm exec playwright install --with-deps
make measure:lighthouse
make test:e2e
```

`reports/bundle.json`, `reports/lighthouse/{mobile,desktop}.{json,html}`, `summary.json`, `coverage/` e Playwright são guardados no artifact de validação. O build `dist/` e o nginx/CSP correspondente ficam no artifact público por SHA/evento antes de E2E reconstruir builds. Fixture não entra nesse artifact. Os resultados finais dos 120 E2E, Docker e segurança são os checks do SHA final do PR.

## Hospedagem e pendência externa

Fase 1 escolhida no ADR008: nginx estático/Compose atrás do Caddy da arquitetura Lightsail do backend, sem provisionamento ou CD neste trabalho. API/emissor/domínio/capacidade serão integrados em #14.

Proteção de main não pôde ser configurada: `admin=false`, `maintain=false`; consulta de proteção 404, rulesets vazios. Payload e procedimento para administrador em `config/branch-protection.json` e `docs/runbooks/branch-protection.md`. Impedimento externo registrado conforme aceite da #8; não afirmar enforcement ativo. O PR continua sujeito a todos os checks e revisão.
