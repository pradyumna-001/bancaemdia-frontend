# ADR 006: Sistema visual — legibilidade, tokens semânticos e SVG próprio

## Status

Accepted — revisão de 29/09/2026, implementada na #4. O responsável autorizou seguir as recomendações da pesquisa visual antes de iniciar esta issue.

## Contexto

A proposta anterior copiava a paleta C1, tema escuro obrigatório, Bricolage Grotesque e JetBrains Mono do monólito. O responsável rejeitou essa aparência e solicitou pesquisa sobre produtos fáceis de usar e SaaS consolidados. A [síntese da pesquisa](../research/visual-direction.md) registra os fundamentos e seus limites: evidência de usabilidade não demonstra que uma paleta específica seja a preferida de todo o público.

Preservamos a disciplina de tokens, acessibilidade e consistência, substituindo a obrigação de reproduzir a identidade antiga.

## Decisão

1. **Tokens semânticos:** `src/styles/tokens.css` contém todas as cores. Superfícies neutras, texto com contraste, azul contido para ação e verde/vermelho reservados aos resultados. Texto e ícones devem comunicar estados além da cor.
2. **Temas:** seguir o sistema é o padrão. O usuário pode escolher Sistema, Claro ou Escuro por controles de rádio acessíveis. A chave `bancaemdia.tema` guarda somente essa preferência, nunca dados de sessão. Mudanças do sistema e de outras abas são acompanhadas. Storage bloqueado mantém a escolha em memória.
3. **Primeira pintura:** um controlador único em `src/styles/tema-inicial.js` é inserido no início do head pelo Vite. Resolve o tema antes de CSS e React. O build calcula o SHA-256 do conteúdo inline exato e gera a configuração nginx, sem `unsafe-inline`. Não editar HTML depois de gerar o hash.
4. **Tipografia:** Source Sans 3, desenhada para interfaces, em pesos 400/600/700, WOFF2 locais com OFL e `font-display: swap`. Corpo 16px, auxiliar 14px, seção 22px e título fluido 28–36px. Números comparáveis usam `lining-nums tabular-nums`, sem obrigar todos os números e legendas a uma fonte monoespaçada.
5. **Ritmo e forma:** tokens de 4/8/12/16/24/32/48px; raio de controle 6px e painel 12px. Alvos interativos de pelo menos 44px. Esses valores são decisões de implementação revisáveis, não preferências universais comprovadas.
6. **Guardas automáticas:** ESLint verifica strings em código da aplicação; varredura de CSS/HTML/SVG verifica valores de declarações e atributos de apresentação. Hex, funções de cor, nomes de cor e fallbacks literais são proibidos fora do arquivo canônico. URLs, âncoras e `currentColor` continuam permitidos. Testes de contraste cobrem pares semânticos dos dois temas.
7. **CSS próprio:** sem framework visual. A base define leitura, foco, tipografia e números; componentes consomem tokens. Sem animação de mudança de tema.
8. **Gráficos (#7):** SVG/CSS próprios, sem Chart.js/Recharts/D3-plot. Evolução com eixo zero e datas proporcionais; barras com comprimento proporcional a |lucro| e espessura √n. A API continua decidindo os números financeiros.
9. **Ícones e ilustrações:** registro único em `Icone.tsx` na #6; ilustrações SVG desenhadas à mão, sem screenshots inventados.

## Consequências e limites

- A #4 aplica a fundação às páginas provisórias e erros existentes. Não inventa telas financeiras nem libera acesso às rotas protegidas.
- Marca/wordmark/favicon são definidos na #5, conforme decisão abaixo; shell e navegação ficam na #6; gráficos na #7. O seletor será acomodado pelo shell quando ele existir.
- Fontes locais dispensam CDN e mantêm CSP restrita, mas os três arquivos somam aproximadamente 456 KiB; o navegador busca os pesos usados e o texto pode aparecer com fallback enquanto carregam. O orçamento completo de desempenho permanece na #8.
- A configuração nginx agora é um artefato do build, inseparável do HTML. Ver [runbook](../runbooks/deploy.md).
- Validar móvel/desktop, teclado, axe, persistência, pre-paint, sincronização e storage bloqueado. CI também verifica a imagem nginx com CSP real.

## Gráficos — #7

Componentes SVG próprios recebem tipos gerados do OpenAPI. Evolução mantém datas proporcionais e eixo zero; comparação mantém comprimento ∝ |lucro| e espessura ∝ √n. Nenhum componente calcula lucro acumulado ou agrega bancas. Linha sem área preenchida, rótulos HTML, dados por foco/toque/ponteiro e tabela equivalente seguem a direção de leitura simples. Valores fora da precisão segura são erro explícito.

Demonstração identificada como fictícia em `/sistema`, mantendo proteção de sessão. Casos de borda, limites e evidências em [validação dos gráficos](../charts-validation.md). O formatador central de centavos é introduzido apenas na extensão necessária; o restante da #16 permanece no backlog.

## Navegação — #6

O topo desktop mantém os sete destinos elegíveis. Em telas até 62rem, a barra inferior prioriza Apostas/Painel/Enviar e Revisão quando há fila; Mais reúne Coleta/Caixa/Resultados. A escolha deixa os rótulos legíveis em 320px. Não supõe uma preferência universal por determinada quantidade de abas; a prioridade poderá ser revista com uso real. As regras e a divisão continuam declaradas em `ABAS`.

Menu nativo modal para os demais destinos, configurações e aparência; indicação de seção atual, alvos de toque e área segura inferior. O conteúdo conserva espaço para a futura lista operacional. Sem gráficos ou números financeiros inventados no placeholder.

## Identidade mínima — #5, 29/09/2026

Adotada a recomendação A dentro da delegação do responsável para seguir a direção pesquisada: assinatura tipográfica em minúsculas, **banca** em Source Sans 3 700 e **emdia** em 400, sem espaço visual inserido e sem símbolo ao lado. A alternativa B acrescenta o símbolo à assinatura; a comparação foi apresentada, sem presumir que ausência de resposta seja aprovação explícita da alternativa A.

A escolha preserva espaço no cabeçalho e leitura do nome. É uma decisão de design, não uma afirmação de preferência comprovada do público. O componente `Logo` expõe um único nome acessível e não acrescenta um link redundante; o shell da #6 poderá envolvê-lo em navegação quando houver destino apropriado.

O favicon é um "b" geométrico desenhado em SVG, com fundo azul de ação e traço em `--sobre-acao` do tema claro. Essa combinação fixa mantém a marca identificável nas abas claras e escuras; não comunica lucro ou estado. Fonte e geometria são independentes: o favicon não depende de download de fonte.

`src/marca/favicon.svg` é a fonte editável com referências a tokens. O plugin Vite resolve essas referências da regra `:root` de `tokens.css` e emite `dist/favicon.svg`, servido também em desenvolvimento. Não há CSS externo, estilos inline ou cores literais duplicadas no código-fonte. nginx serve SVG com MIME correto, sem cache persistente e sem fallback de SPA para ícone ausente.

Cabeçalhos provisórios, login, erro de rota, falha de configuração e carregamento inicial usam a mesma assinatura. Não são introduzidos shell, novo acento, dependência ou fonte adicional.
