# Cobertura do produto — #36

Versão API, limites e gates: [contrato do conjunto](../contracts/e2e-produto.md).
Os arquivos abaixo são obrigatórios em CI no mesmo SHA frontend e pin API; um
resultado de fixture não comprova disponibilidade de serviço.

| Capacidade                                | SPA/API reais                                                                              | Apresentação e estados                      | Limite externo explícito                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------- |
| Identidade, cadastro, recuperação, sessão | `test_browser_contract.py`, 16 casos por navegador no suplemento, mais gate original       | account/session/route-errors specs          | Emissor produtivo/homologação não certificados pelo emissor local            |
| Trial, 402, leitura, exportação           | `test_public_spa_commercial_access`, `test_privacidade_contract.py`, API billing integrado | acesso/assinatura specs                     | Checkout/portal e preços comerciais têm aceite próprio; não há cobrança live |
| Contas, titulares, atribuição e troca     | core/troca contracts; consolidação API testa fronteira temporal/conta explícita            | contas/troca specs                          | Integração administrativa das candidatas                                     |
| Lista, resumo, filtros, detalhe, foto     | core/browser contracts                                                                     | apostas/detalhe/midia specs                 | Nenhum cálculo ou filtro local substitui população canônica                  |
| Resultados e desfazer                     | resultados contract, inventário API próprio                                                | resultados spec                             | Sem replay automático ou PENDENTE fabricado                                  |
| Export Telegram, prints, planilha         | entry/prints/sheet contracts; worker/Redis reais                                           | enviar/prints/planilha specs                | Extração usa entrada sintética em cache; não certifica IA paga               |
| Revisão                                   | revisao contract e gates API                                                               | revisao spec                                | Evidência e decisão pertencem à API                                          |
| Caixa                                     | caixa contract, API e banco                                                                | caixa/replay specs                          | CRUD/capital/modo de banca pendentes na #50 não são simulados                |
| Vínculo Telegram                          | commercial access com comando privado real, nos três browsers                              | telegram spec                               | Transporte externo/endereço do bot aguardam lançamento                       |
| Coleta e dispositivos                     | coleta contract com API TLS real                                                           | coleta spec                                 | Release da extensão/leitor/host real e API #118 têm aceite próprio           |
| Duplicidade Casa × Telegram               | product contract, ambas as ordens, dois viewports, três browsers; consolidação API         | Lista/detalhe reais, temas, axe e reflow320 | Envelopes são sintéticos; nenhum domínio de casa é certificado               |
| Painel, Análises e evolução               | core/analises contracts                                                                    | painel/analises/graficos specs              | Populações e frescor separados explicitamente                                |
| Hipotética                                | hipotetica contract e aceites API #191                                                     | hipotetica spec                             | Versão conjunta candidata, sem promoção à main                               |
| Metas e fuso                              | metas/browser contracts                                                                    | metas/configuracoes specs                   | POST legado desconhecido não é conciliado pela lista                         |
| Quatro calculadoras                       | commercial access usa as quatro pela SPA em READ_ONLY nos três browsers                    | calculadoras spec, golden cases e erros     | Sem modelo de linhas ou cálculo financeiro no cliente                        |
| Privacidade e primeiro uso                | privacidade/inicio contracts                                                               | privacidade/inicio specs                    | Export pessoal global; encerramento só pelo estado autoritativo              |
| Ajuda, Excel e lançamento                 | jornada central baixa/abre Excel; ajuda pública sem identidade                             | ajuda spec                                  | Sem binário/checksum da extensão inventados                                  |

Arquivos reais estão em `tests/identity/`; apresentação em `tests/e2e/` usa fixtures
isoladas em `tests/fixtures/`, nunca um bypass no bundle público. As suites visuais
cobrem Chromium/Firefox/WebKit em 390×844 e 1440×900, dois temas, reflow320, teclado,
axe e erros/estado vazio/resultado desconhecido pertinentes. Revisão de UI não é
certificação integral de acessibilidade nem pesquisa com participantes.

`product-<browser>-report.json` registra o SHA frontend, SHA/hash API, disponibilidade
e inventário do suplemento. JUnit registra tempos por caso para medir custo do CI;
o job tem limite de 30 minutos e não aumenta timeouts individuais nem limites do
servidor. Todos os jobs anteriores mantêm suas reservas e gates. A verificação final
do PR deve conferir todos os checks no commit final, artefatos, cobertura por arquivo,
JS <=200.000 bytes gzip e build/CSP públicos, sem incluir fixtures.

Lançamento continua condicionado a #14/#35/#37/#38/#39/#50 e aos aceites externos
citados. Uma CI verde do sandbox não equivale a release completo.
