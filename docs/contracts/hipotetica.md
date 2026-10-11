# Hipotética — frontend #21

Prioridade registrada em 11/10/2026 pelo titular. A pergunta é “E se eu seguisse a stake do tipster?”. `/e-se` é protegida, acessada por link secundário em Apostas; mantém a área ativa e os filtros na URL. Não entra na capa nem no Excel real.

## Versão e dependências

Backend [#190](https://github.com/pradyumna-001/bancaemdia-api/issues/190) / [PR #191](https://github.com/pradyumna-001/bancaemdia-api/pull/191), commit `552c4ffe3924df3eac2caa50ea4f5df4c553b816`. OpenAPI inteiro SHA-256 `107ae37c1c6effadd467976e346d5615ba0ae2203505922b4224c65650ec2f3a`, 97 operações. Fonte, tipos, políticas e validadores procedem do mesmo documento verificado. A candidata incorpora #184, não #189/#187. Merge e disponibilidade produtiva permanecem com o administrador; `check:contract-integration` continua bloqueando promoção de candidato.

A PR frontend parte de main, herda fundação #80 e apresentação #83, e reaproveita os filtros/validadores já revisáveis em #85. A #20/#85 e #32/#86 permanecem em suas PRs, com seus contratos. Esta árvore não incorpora endpoints de diário/grupos ausentes na #191 nem concatena documentos. Depois dos merges, reconciliar o pin integrado completo e os componentes compartilhados antes de publicação.

## Leitura, dinheiro e população

GET `/api/v1/painel/hipotetica`, operação comercial `hipotetica_historica`, explicitamente permitida em FULL_WRITE e READ_ONLY. Cookie HttpOnly, captura de sessão, query privada por época e descarte de resposta antiga; nenhuma mutation nova. GET segue recuperação limitada já existente. Retry-After embarga também mudança de filtro e atualização manual, sem repetir para 404/405/422. Um erro de atualização rotula a última resposta como antiga; mudar de recorte não reutiliza seus dados.

Filtros seguem a URL/adaptador canônico: período ou datas, dimensões exatas, resultado/origem/revisão/visibilidade. Datas civis tornam-se limites [início,fim exclusivo) São Paulo, calculados apenas para serialização temporal. Somente parâmetros publicados chegam à API, nunca `page`, `page_size`, stake livre ou parâmetro de demonstração. A resposta é validada contra metadados gerados e o recorte solicitado. Mais de 10000 registros produz recusa integral; UI sugere reduzir o período sem remover filtros por conta própria.

`stake_dica_confirmada_odd_resultado_reais_v1`: apenas a stake/face da dica confirmada substitui a real, mantendo odd/resultado reais. Sem vínculo ou stake igual não muda a aposta. Dica confirmada não conta dinheiro novamente. Dinheiro é string decimal inteira BRL centavos, incluindo agregados além de BIGINT; `format.ts` exibe sem float. ROI/taxa de acerto são frações decimais fornecidas pela API, formatadas textualmente como percentual. Deltas já vêm como hipótese menos real.

Os seis estados publicados e os quatorze motivos de limitação têm mensagens pt-BR. CASHOUT diferente, taxas/bônus/fixos, dados incompletos e vínculos ambíguos não viram escala local. Totais null mostram “Não informado”, nunca zero ou total parcial fabricado. Pendentes mostram exposição/face, sem lucro futuro. Visibilidade de apagadas é auditoria explícita. Critério temporal, fonte, BRL, snapshot e composição estão visíveis; detalhes financeiros auxiliares ficam sob demanda.

## Evidências

Exemplos oficiais completos em `tests/fixtures/hipotetica.json`, separados do bundle público. Vitest verifica dinheiro exato/razões enormes, recorte/datas/metadados recusados, estados e erros/retry. Playwright verifica ambos os viewports e três navegadores, contraste nos dois temas, teclado, reflow 320px, link secundário e proteção contra a origem da fixture.

O gate de identidade usa a própria árvore #191, SPA pública com CSP exata, emissor hospedado e PostgreSQL/RLS descartáveis. Mantém os quatorze percursos anteriores e acrescenta comparação histórica em cada viewport (16 casos SPA, 9 backend, zero skips): exemplo 16000/32000 → 2000/4000, dica RED/odd9 preservando GREEN/odd2 reais, recorte de conta/data/origem, READ_ONLY, outro tenant sem dados, 404 indistinguível e snapshot imutável de apostas/eventos/vínculos/Caixa, logout sem dados antigos. Dados de teste são inseridos somente no banco descartável; a SPA não recebe override de sessão.

Demonstração em build separado `dist-hipotetica-fixture`, nunca `dist`. Serve apenas a apresentação; não certifica integração ou lançamento. CI conserva budget JS inicial 200000 bytes gzip, cobertura por arquivo 80% nas quatro métricas, drift dos três arquivos gerados e gates de identidade/qualidade/segurança no SHA final.
