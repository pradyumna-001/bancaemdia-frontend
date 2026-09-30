# ADR 004: URL, população dos filtros e frescor dos dados

## Status

Revisado pelo ADR019 em 29/09/2026; issues #17/#9 e consumidoras.

## Decision

1. Filtros visíveis e paginação vivem na URL. Adapter por recurso mapeia nomes amigáveis para campos realmente suportados. Preservar contexto ao navegar não significa afirmar que todas as telas aplicam os mesmos filtros.
2. Invalidade sintática conhecida normaliza antes da chamada. Filtro válido rejeitado por contrato/erro não desaparece silenciosamente. Explicar escopo diferente ou bloquear a opção até existir suporte.
3. Main usa page/page_size, desde/ate e dimensões específicas; cursor não é contrato atual. Datas e atalhos têm fronteiras/fuso explícitos. Pickers próprios acessíveis sem select/date nativo.
4. `apagadas=1` continua estado de URL do site. `incluir_apagadas=true` na API inclui ativas e apagadas; somente apagadas depende de contrato #50. Nunca filtrar só a página local para simular esse conjunto.
5. Resumo, gráficos, lista e exportação usam população equivalente ou identificam escopos distintos. Não recalcular agregado a partir de itens/páginas. Titular/conta/grupo/banca exigem suporte real por recurso.
6. queryKey inclui recurso, usuário/sessão e params normalizados. Logout/troca de conta elimina cache privado. staleTime padrão 30s listas, 60s painel, 0 revisão; detalhes podem ajustar com evidência.
7. Sucesso de escrita depende da resposta autoritativa; invalidar/refetch dados afetados. Refetch não força atualização de MV: `fresh=true` escolhe primário, não refresh. Mostrar confirmação da gravação e frescor/pêndencia de atualização sem spinner eterno ou promessa de agregado instantâneo.
8. Otimismo só para feedback de ação autorizado, com rollback; totais financeiros continuam da API. Fila de desfazer em sessionStorage é por usuário/sessão, limpa no logout e exige reconciliação de versão/concorrência antes de escrever.
9. Destrutivas têm confirmação ou desfazer conforme contrato. Encerrar conta, remover aposta e reset de dados são operações diferentes; não substituir uma pela outra.

## Consequences

Histórico, pílulas e links são reproduzíveis sem filtros silenciosos. Um número válido porém antigo é apresentado com seu contexto, não substituído por cálculo do navegador.
