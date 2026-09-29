# AGENTS.md — bancaemdia-frontend

Regras invioláveis herdadas do monólito (`Planilhador-apostas`) e adaptadas para o SPA. Um teste, lint ou revisão deve barrar a violação de cada regra abaixo.

## Dinheiro

1. **Quem decide não desenha.** Nenhum cálculo financeiro no cliente — lucro, ROI, saldo, projeção, fator de lucro, faixas de stake vêm prontos dos endpoints (`/api/v1/painel`, `/api/v1/caixa/saldo`, `/api/v1/apostas`). O site continua sendo "a terceira tela do mesmo dinheiro": o backend é a única fonte de decisão. Formatadores (moeda, odd, data) são aceitos; cálculos, não.
2. **Centavos e sinal** chegam da API (BIGINT centavos, sem float). Exibição: formatador único em `src/lib/format.ts`. Nunca multiplicar/dividir por 100 fora dele.
3. **Nada some silenciosamente.** Filtros inclusive de itens apagados só mudam por ação explícita do usuário; estado de visualização viaja na URL (ver abaixo).

## Vocabulário (pt-BR, vocabulário do dono)

4. Termos fixos: "Painel" (nunca "Dashboard"), "Apostas", "Revisão", "Coleta", "Caixa", "Resultados", "Enviar". Estados da aposta: PENDENTE/GREEN/RED/ANULADA/CASHOUT/MEIO_GREEN/MEIO_RED. Tabela de termos canônicos vive em `src/lib/termos.ts`.
5. Mensagens de erro em português, sem JSON cru, sem stack trace, sem página morta — regra "§1-bis" do SITE.md original: **qualidade de tela é requisito mensurável**.

## Qualidade de tela mensurável (herdada, automatizada em e2e)

6. Um toque = um resultado: marcar 20 resultados exige 20 toques, sem recarregar a tela.
7. Nenhum estado morto: toda lista tem estado vazio com ação sugerida; toda tela tem erro estilizado (404/405/500); toda ação destrutiva tem confirmação ou desfazer.
8. Nenhum `<select>` nativo nem `<input type="date">` nativo — pickers próprios (regra de design do sistema visual).
9. Fotos/media reservam espaço antes de carregar (nenhum reflow) e têm lazy loading.
10. Mobile e desktop são inegociáveis — toda mudança de tela precisa de verificação nos dois viewports no PR.

## Estado, navegação e URL

11. **A URL é a fonte da verdade dos filtros.** Filtros ativos (casa, tipster, grupo, banca, estado, origem, período, `?apagadas=1`) vivem em query params: pílulas removíveis, links compartilháveis, sem perda silenciosa de estado ao navegar.
12. Navegação tem fonte única: lista `ABAS` em `src/app/nav.ts` renderiza topo (desktop) e barra inferior/menu Mais (mobile). Apostas, Painel e Enviar têm acesso direto no celular; Revisão só aparece com fila não-vazia e mostra o contador. Coleta, Caixa e Resultados ficam em Mais no celular. Links entre abas preservam os query params.

## Paleta e tipografia

13. Cor só existe como token CSS em `src/styles/tokens.css`: superfícies neutras e cores semânticas de ação, foco e resultado (ADR 006 revisado após pesquisa). ESLint e varredura CSS/HTML/SVG proíbem cor literal fora desse arquivo; estados nunca dependem apenas da cor.
14. Aparência segue o sistema por padrão; escolhas explícitas Claro/Escuro persistem. `data-tema="claro|escuro"` é resolvido antes da pintura, com script autorizado por hash exato na CSP. Storage indisponível não pode impedir o uso.
15. Source Sans 3 para a interface, servida localmente em WOFF2 com licença OFL e `font-display: swap`; nenhum CDN. Números comparáveis usam algarismos tabulares (`.numero`). Marca: `Logo` único, "banca" em 700 + "emdia" em 400; favicon gerado de `src/marca/favicon.svg` usando os tokens, sem cores duplicadas (ADR 006).
16. Sem biblioteca de gráficos: gráficos são SVG/CSS próprios (componentes em `src/components/graficos/`), incluindo a regra barra: comprimento ∝ |lucro|, **espessura = √(nº de apostas)**.
17. Ícones inline SVG registrados em um macro único `src/components/Icone.tsx`; nome novo de ícone exige registro. Ilustrações SVG desenhadas à mão; nenhuma captura de tela inventada em tutoriais.

## API e resiliência

18. Tipos gerados do OpenAPI da API (`openapi-typescript`) — código de domínio nunca declara shape de resposta à mão.
19. Query params inválidos **nunca quebram a tela**: inválido → valor padrão (a API devolve 422, mas a UI já deve cair para defaults antes, como o monólito fazia).
20. Operation 202 de upload/extração é assíncrona: UI faz polling de `/api/v1/upload/{job_id}` (1s, exponencial depois), pausada no cartão de autorização de gasto quando a API sinalizar.
21. Rate limit (429) e 503 têm copy própria e retry com backoff; nunca laço infinito de tentativa.

## Segurança

22. Nenhum segredo no bundle: apenas `VITE_` vars públicas, documentadas em `.env.example`.
23. Token de sessão nunca em `localStorage` legível por terceiros — decisão de transporte de token em ADR 003; redirects pós-login só para destinos internos (guard `destinoInterno`).
24. Sem CSP relaxada em produção; ver `docs/runbooks/deploy.md`.

## Fluxo de trabalho

25. Issue → branch `feat/<n>-descricao` → PR pequeno → revisão → merge. PRs referenciam a issue e o ADR (`Closes #N`, `Implements ADR-0XX`).
26. `make lint && make typecheck && make test` verde local antes de push; e2e no CI.
27. Toda mudança estrutural relevante atualiza este arquivo e/ou ADR.
28. **PR só pode ser entregue como pronto fora de rascunho e com todos os testes/checks verdes no commit final.** Rascunho temporário durante o trabalho é permitido, mas deve ser convertido antes da entrega. Após o último push, aguardar os checks terminarem e conferir o SHA validado; ausência de checks, estado pendente ou sucesso em commit anterior não equivalem a aprovação. Não remover workflows, desabilitar testes ou enfraquecer gates para obter verde. Se um impedimento externo estiver fora do controle do agente, informar explicitamente o impedimento e o estado real, sem declarar o PR pronto.
29. Demonstrações que injetam sessão simulada ficam exclusivamente em `tests/fixtures/`, com build separado de `dist/`. Nenhum query param, storage ou variável pública pode liberar sessão na aplicação; o build público é testado contra o endereço da fixture.
