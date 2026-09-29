# Direção visual adotada na #4

Síntese operacional da pesquisa solicitada pelo responsável e aprovada para implementação em 29/09/2026.

## Fundamentos

- **Facilidade de uso é observável:** conclusão de tarefas, tempo, erros, compreensão e satisfação são medidas úteis. Preferência pessoal e popularidade comercial não substituem testes com o público do produto.
- **Hierarquia e reconhecimento:** rótulos claros, padrões familiares, ações previsíveis e feedback visível reduzem a necessidade de memorizar. Ver [heurísticas de usabilidade da Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/).
- **Contraste e operação:** a [WCAG 2.2](https://www.w3.org/TR/WCAG22/) define contraste mínimo, foco, teclado, reflow e uso de cor. A base adota 4,5:1 para textos, 3:1 para foco/controles e alvos de 44px, além de verificar ausência de rolagem horizontal nos viewports de teste.
- **Consistência de produto:** sistemas como [Carbon](https://carbondesignsystem.com/guidelines/color/overview/) e [Atlassian](https://atlassian.design/foundations/color/) organizam cores por função e tema. São referências de implementação; sua existência não prova que a estética cause sucesso comercial.
- **Tipografia adequada à tarefa:** a [Source Sans 3 da Adobe](https://github.com/adobe-fonts/source-sans) foi concebida para interfaces. Pesos moderados, tamanho legível e números tabulares sustentam a leitura de listas e valores.

## Aplicação ao bancaemdia

Superfícies neutras, texto contrastante, ação em azul contido, foco visível e verde/vermelho com função de resultado. A cor jamais substitui texto de estado. Tipografia de interface única, números alinháveis e espaçamento consistente; evitar decoração que concorra com a tarefa.

Tema acompanha o sistema com escolha explícita persistida. A interface precisa continuar utilizável com storage bloqueado, falhas de configuração e rotas inexistentes. Erros oferecem recuperação em português.

## O que ainda precisa ser validado com uso real

A paleta, fonte e raios escolhidos são recomendações informadas, não resultados de pesquisa com usuários do bancaemdia. Nas telas funcionais, verificar identificação da ação principal, marcação de resultados, leitura de valores e entendimento de filtros com participantes representativos. Comparar taxa de conclusão, erros e tempo; coletar preferência visual separadamente. Não confundir telas simples por ausência de funções com simplicidade de uma tarefa real.

As etapas seguintes devem construir marca (#5), navegação (#6), gráficos (#7) e telas funcionais mantendo essa direção e revendo decisões quando houver evidência de uso. Não são necessárias extensões ou assinaturas para implementar esta fundação.
