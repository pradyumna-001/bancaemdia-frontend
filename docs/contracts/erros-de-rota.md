# Erros de rota e retorno contextual — #13

Esta entrega trata abertura/navegação da página. Falhas de operações, campos, acesso comercial e gravações permanecem no [contrato da #10](recuperacao.md); identidade permanece no [contrato de sessão](sessao.md). Não adiciona endpoint, schema, permissão ou cálculo financeiro.

## Mensagens e retorno

| Falha                                           | Apresentação                       | Próximo passo                                                   |
| ----------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Endereço fora do catálogo                       | Não achei esta página              | Voltar à área reconhecida ou ao tutorial                        |
| 403/404 em rota reconhecida                     | Este recurso não está disponível   | Voltar à área, sem afirmar existência, titularidade ou exclusão |
| 405                                             | Esta ação não está disponível      | Voltar; sem repetir a ação                                      |
| 500/renderização                                | Não foi possível abrir esta página | Abertura explícita via GET ou retorno                           |
| 429/503 normalizado pelo cliente                | Espera/indisponibilidade própria   | Respeitar Retry-After, sem navegação automática                 |
| ApiError com resultado de gravação desconhecido | Confira se o pedido foi concluído  | Conferir pela área de origem; sem oferecer repetição            |

`errorContext` escolhe destinos fixos de ABAS por segmento, nunca usa o endereço desconhecido como redirect nem o histórico externo. Apostas recebe detalhes `/aposta/*`; Painel, Contas e titulares, Coleta e demais áreas retornam à raiz canônica correspondente. Conta retorna a `/login` com destino validado por `destinoInterno`. Prefixos parecidos, como `/painel-alheio`, não identificam uma área.

Query e seção não secretas são preservadas. Parâmetros de protocolo são removidos como na #12; `destino` só é usado na jornada de conta, validado antes de ser aninhado. Preservar filtros não afirma que toda área os aplica: normalização/capacidade por recurso continua na #17. Endereço desconhecido permanece público, sem consultar identidade ou afirmar acesso privado. Entrar numa área protegida depois do retorno continua sujeito ao guard real.

## Limites do boundary

Cada rota protegida mantém um layout pai com loader de sessão, RequireSession e Shell. A página é um filho index com seu próprio boundary. Falha no filho mantém navegação e contador; falha no guard, Shell ou layout sobe ao boundary externo e não exibe shell com identidade não comprovada. Nada da fila é consultado quando o guard falha ou nega acesso.

RequireSession permanece acima tanto da página quanto do erro interno: fim/troca de sessão oculta/desmonta o contexto privado conforme #11, e não deixa o boundary contornar a autorização. Catálogo, ordem/elegibilidade de ABAS e URLs públicas/protegidas não mudam. Todo layout continua revalidando sessão pela rota acessada.

O router pode executar loaders pai/filho em paralelo. A existência do layout não autoriza uma chamada de domínio: futuras consumidoras devem usar o cliente/sessão autenticados da #9/#11 e os guards do servidor, nunca depender da ordem dos loaders. Esta entrega não adiciona loader de API de domínio; as consultas de falha são apenas da fixture isolada.

A tentativa usa [useRevalidator](https://reactrouter.com/api/hooks/useRevalidator) para executar os loaders via GET, inclusive quando a URL tem seção. Não altera URL/histórico e nunca ressubmete action/formulário. O código instalado do React Router 7.18.4 e os testes confirmam leitura sem replay de action; navegação comum para a mesma seção poderia deixar o erro sem recuperação. O botão fica desabilitado durante navegação ou Retry-After. Não há retry automático adicional ao cliente/QueryClient, nem tratamento de mutations como leituras. Formulários que precisam permanecer montados recuperam erros em ErroApi; um boundary fatal não promete salvar entradas de componente que já falhou.

O título recebe foco uma vez por entrada/mudança de mensagem, e uma mensagem local com role=alert anuncia o erro. Término de prazo, tema e atualizações de fila não retomam o foco. SVG próprio decorativo reserva 112×64, não participa da compreensão; texto/ações funcionam sem ele. Interface reutiliza tokens, fonte e temas do ADR006, sem nova direção visual. O diagnóstico da aplicação registra somente evento fixo/status, sem corpo de resposta, URL, credenciais ou stack.

Quando a revalidação recupera uma página dentro do Shell, o foco vai ao conteúdo, sem tomar o foco de um menu aberto ou de controle externo. Falha persistente mantém o título de erro. A suíte de configuração controla a resposta 401 dos endereços de exemplo, evitando dependência de DNS/serviço externo para provar boot e reabertura; isso não substitui a prova real de identidade.

## Evidências e disponibilidade

Testes unitários verificam retorno seguro, status/copy, guard negado/falho, shell, tentativa, filtros/seção, espera e resultado incerto. A matriz Playwright força 404/405/500 em Apostas, Painel, Contas, Coleta, Caixa, Calculadoras, Assinatura, Configurações, Enviar, Resultados, Revisão e Conta. Também verifica erro de render, GET único após ação, clique duplicado bloqueado, Axe, claro/escuro, teclado e reflow 320px.

A injeção de falhas está somente em `tests/fixtures/shell/routeFailures.tsx`, no build separado `dist-shell-fixture/`, com respostas interceptadas pelo teste. Não há query param, rota de demonstração ou storage para forçar falha/liberar sessão no aplicativo. O build público é verificado contra a URL/flags da fixture. Capturas `erro-endereco-*.png` vêm do aplicativo público; `erro-recurso-*.png` vêm do ensaio de boundary no build separado e não provam identidade ou páginas de domínio entregues.

Preview público mostra o 404 real em endereço inexistente e retorno contextual, sem sessão fabricada. Os gates permanentes e a prova de identidade real continuam obrigatórios no commit final; resultado do ensaio visual não os substitui. A publicação geral continua sujeita às integrações de backend/ambiente, sem deploy ou provisionamento nesta issue.
