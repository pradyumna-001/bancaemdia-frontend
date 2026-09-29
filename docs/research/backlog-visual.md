# Aplicação da pesquisa ao backlog

Revisão de 29/09/2026 solicitada pelo responsável antes da issue #7. Abrange as 39 issues do plano, inclusive as já implementadas em PRs ainda abertos. Os critérios específicos estão em cada issue e nos ADRs 014–018; este documento reúne os critérios comuns.

## Fontes e precedência

A [síntese da pesquisa](visual-direction.md) registra fontes, fundamentos e limites. O [ADR 006](../adrs/006-visual-system.md) é a decisão visual vigente. Os ADRs 013–018 preservam inventário, contratos e regras de negócio, mas referências ao monólito significam paridade de tarefas e dados, não reprodução de sua aparência. Os trechos conflitantes foram substituídos nesta revisão.

Facilidade de uso deve ser avaliada por conclusão, erros, tempo e compreensão. Padrões de produtos consolidados orientam hipóteses; não demonstram que uma paleta específica seja a preferida do público nem que a aparência cause sucesso comercial. As decisões aprovadas podem ser revistas com evidência de uso.

## Critérios comuns para mudanças de interface

- Organizar cada tela pela tarefa: título claro, contexto necessário, ação principal reconhecível e detalhes secundários sob demanda. Reduzir decoração, painéis redundantes, métricas sem pergunta e ícones sem rótulo. Não remover informações ou funções para fazer a tela parecer simples.
- Reutilizar Source Sans 3 local (400/600/700), números tabulares comparáveis, Logo e Icone. Todas as cores em tokens semânticos; superfícies neutras, azul de ação, verde/vermelho para resultados, texto/ícone além da cor. Sem restaurar fontes ou paleta antigas.
- Sistema é a aparência padrão; Claro/Escuro persistem e são aplicados antes da pintura. Storage bloqueado não impede uso. Espaçamento/raios/alvos seguem tokens do ADR 006; mínimo de 44px por decisão do produto e 48px nos botões de Resultados.
- Desktop e celular têm igual cobertura funcional, adaptando disposição e densidade. Verificar 390×844 e 1440×900, reflow a 320px, zoom e teclado. Evitar rolagem horizontal da página; tabelas que precisam de duas dimensões podem ter rolagem contida, identificada e operável.
- Preservar filtros na URL, histórico e contexto ao navegar. Usar ABAS e shell existentes: topo desktop; barra inferior móvel com Mais. Caixa é o nome da seção /banca; banca continua sendo conceito de domínio, sem renomear contratos arbitrariamente.
- Carregamento, vazio inicial, filtro sem resultados, falha, atualização e sucesso são diferentes. Aplicar os estados pertinentes à tela, reservar espaço para mídia e dados e manter dados válidos quando uma atualização falhar. Não usar zeros, percentuais ou métricas fictícias para preencher lacunas.
- Formulários têm labels persistentes, ajuda próxima, validação associada e entrada preservada após falha. Ações explicam o resultado; destrutivas têm confirmação ou desfazer conforme a regra de negócio. Pickers próprios são reutilizáveis e acessíveis; sem select/date nativo, conforme a restrição vigente do produto.
- Teclado, foco visível e não encoberto, nomes acessíveis, anúncios úteis e contraste em ambos os temas fazem parte do aceite. Usar semântica HTML e não depender de hover/cor. Respeitar movimento reduzido quando houver animação. Axe é uma verificação parcial, complementada por inspeção manual.
- Dinheiro e decisões financeiras continuam no backend. Formatação centralizada e geometria dos gráficos são apresentação; lucro acumulado, ROI, saldo e projeção não são calculados no cliente. Lacunas de API permanecem explícitas. Demonstrações identificam dados simulados e respeitam o isolamento de sessão definido em AGENTS 29.

## Evidência e entrega

Mudança de tela anexa capturas móvel/desktop nos dois temas e registra cenários/limites; testes exercitam comportamento relevante, sem exigir testes artificiais para ajustes documentais. Estudos com participantes são distintos da revisão visual e dos testes automatizados. Registrar o que foi realmente observado.

Toda entrega de PR segue AGENTS 28: fora de rascunho e todos os checks aplicáveis verdes no SHA final, sem desabilitar gates. Referenciar a issue e ADRs pertinentes. As issues técnicas aplicam os critérios visuais apenas às interfaces que afetam; não ganham telas novas por esta revisão.

## Rastreabilidade

Os números locais dos ADRs reiniciam por semana. Mapeamento para GitHub: ADR 014 → #1–#8; ADR 015 → #9–#15; ADR 016 → #16–#23; ADR 017 → #24–#30; ADR 018 → #31–#39.

Esta revisão altera especificação, não implementa a próxima issue, não muda prioridades, estimativas, responsáveis ou estados e não declara trabalho futuro concluído. As implementações #1–#6 permanecem vinculadas aos PRs #40–#45, aguardando o fluxo de revisão/merge.
