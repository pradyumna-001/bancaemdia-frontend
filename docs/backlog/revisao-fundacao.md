# Revisão das issues #1–7 — correção #48

| Issue/PR | Resultado da auditoria                                           | Alteração                                                                                                                                          |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1 / #40 | Scaffold e types source ainda compatíveis com main               | Preservar ferramentas/versões atuais; contratos e critérios da expansão em #9/#50, sem trocar schema por união de PRs                              |
| #2 / #41 | Config runtime e CSP estrita aproveitáveis                       | Preservar; origens da API/emissor serão definidas #49/#14, sem inventar flag pública para liberar recurso                                          |
| #3 / #42 | Rotas limitadas ao inventário antigo                             | Catálogo protegido ganha contas/titulares, assinatura, calculadoras, análises/metas, conexões/privacidade; allowlist de retorno acompanha catálogo |
| #4 / #43 | Pesquisa visual permanece válida                                 | Preservar fontes locais, tokens, temas e acessibilidade; contexto funcional atualizado no ADR019                                                   |
| #5 / #44 | Marca não conflita com backend                                   | Preservar sem retrabalho visual arbitrário                                                                                                         |
| #6 / #45 | Shell preso a sete destinos e configuração fora do catálogo      | ABAS contém novos destinos secundários e elegibilidade desktop/mobile; rotas filhas mantêm seção ativa; configuração tem uma fonte                 |
| #7 / #47 | Gráficos básicos já usam dados de API e rótulos/totais revisados | Preservar geometria e melhoria visual; não prometem cobrir análises/metas futuras nem calculam agregados. Ampliação em #56                         |

O PR de correção da issue #48 é incremental sobre o HEAD da #7, sem reescrever os anteriores ou fazer merge administrativo. Números de PR corretivos são registrados no momento da entrega. Páginas novas são explicitamente preparação; não simulam assinatura, cadastro de titular, conexão nem cálculo. Todos os checks existentes continuam exigidos, incluindo guard e isolamento da fixture pública.
