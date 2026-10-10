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
12. Navegação tem fonte única: lista `ABAS` em `src/app/nav.ts` renderiza topo (desktop) e barra inferior/menu Mais (mobile). Apostas, Painel e Enviar têm acesso direto no celular; Revisão só aparece com fila não-vazia e mostra o contador. Coleta, Caixa e Resultados ficam em Mais no celular; Contas e titulares, Calculadoras, Assinatura e Configurações são destinos secundários também no desktop. ABAS define elegibilidade desktop/mobile; rotas filhas mantêm a área ativa. Links entre áreas preservam query params, sem afirmar que um filtro é aplicado onde a API não o suporta.

## Paleta e tipografia

13. Cor só existe como token CSS em `src/styles/tokens.css`: superfícies neutras e cores semânticas de ação, foco e resultado (ADR 006 revisado após pesquisa). ESLint e varredura CSS/HTML/SVG proíbem cor literal fora desse arquivo; estados nunca dependem apenas da cor.
14. Aparência segue o sistema por padrão; escolhas explícitas Claro/Escuro persistem. `data-tema="claro|escuro"` é resolvido antes da pintura, com script autorizado por hash exato na CSP. Storage indisponível não pode impedir o uso.
15. Source Sans 3 para a interface, servida localmente em WOFF2 com licença OFL e `font-display: swap`; nenhum CDN. Números comparáveis usam algarismos tabulares (`.numero`). Marca: `Logo` único, "banca" em 700 + "emdia" em 400; favicon gerado de `src/marca/favicon.svg` usando os tokens, sem cores duplicadas (ADR 006).
16. Sem biblioteca de gráficos: gráficos são SVG/CSS próprios (componentes em `src/components/graficos/`), incluindo a regra barra: comprimento ∝ |lucro|, **espessura = √(nº de apostas)**.
17. Ícones inline SVG registrados em um macro único `src/components/Icone.tsx`; nome novo de ícone exige registro. Ilustrações SVG desenhadas à mão; nenhuma captura de tela inventada em tutoriais.

## API e resiliência

18. Tipos gerados do OpenAPI da API (`openapi-typescript`) — código de domínio nunca declara shape de resposta à mão. `config/api-contract.json` fixa commit e SHA-256; tipos e políticas de upload/idempotência são gerados do mesmo documento e ambos têm gate de drift. Atualização exige versão integrada/revisão, sem URL flutuante ou união de branches.
19. Query params inválidos **nunca quebram a tela**: inválido → valor padrão (a API devolve 422, mas a UI já deve cair para defaults antes, como o monólito fazia).
20. Operation 202 de upload/extração é assíncrona: UI faz polling de `/api/v1/upload/{job_id}` (1s, exponencial depois), com estados reais da API. O usuário envia o export e acompanha o resultado; nunca exibir estimativa/aviso de custo de processamento nem etapa Autorizar/Agora não. Limites máximos de gasto por usuário são controlados exclusivamente pelo backend, sem aprovação de gasto na UI (decisão de 06/10/2026, ADR019). Não inventar estado de job; cancelar observação não cancela processamento.
21. Rate limit (429) e 503 têm copy própria e retry com backoff; nunca laço infinito de tentativa. Queries são somente GETs seguros: 500 até 1 retry, 503 até 3, 429 até 2, rede/timeout até 1, respeitando Retry-After. Prazo >60s encerra retry automático sem antecipar o prazo manual. Mutations/cancelamento/resultado desconhecido não são repetidos. Não remover filtro válido após recusa; campo 422 usa projeção segura de loc e labels locais, sem input/msg/ctx. Ver ADR005/#10.

## Segurança

22. Nenhum segredo no bundle: apenas `VITE_` vars públicas, documentadas em `.env.example`.
23. Identidade conforme ADR003/#49/#11: tokens ficam somente no servidor; ProvedorAuth consulta cookie HttpOnly/Secure e mantém CSRF/versão em memória. Nunca token/CSRF em localStorage/sessionStorage ou configuração pública. Redirects pós-login só para destinos internos (guard `destinoInterno`); `return_to` da API não aceita fragmento. Somente destino/fragmento não secreto pode ficar transitoriamente em sessionStorage, consumido uma vez. Refresh/logout exigem Web Lock e nova consulta dentro da trava; BroadcastChannel transmite apenas eventos de controle. Logout/troca cancelam requests, limpam queries/mutations e desmontam dados privados; respostas antigas são descartadas inclusive após parsing. Mutations não ganham retry de sessão. Recursos privados externos ao React registram limpeza no serviço. Prova de sandbox não é deploy nem autoriza promover schema de PR ao contrato integrado; ver `docs/contracts/sessao.md`.
24. Sem CSP relaxada em produção; ver `docs/runbooks/deploy.md`.

## Fluxo de trabalho

25. Issue → branch `feat/<n>-descricao` → PR contra `main` → revisão → merge. Não abrir PRs empilhadas. Dependências ainda abertas não impedem abrir a PR contra `main`: declarar os PRs necessários, separar o escopo próprio do código herdado no texto/revisão e reconciliar a branch após integração ou alterações nas dependências. Não fazer merge para contornar essa regra. PRs referenciam a issue e o ADR (`Closes #N`, `Implements ADR-0XX`).
26. `make lint && make typecheck && make test` verde local antes de push; e2e no CI.
27. Toda mudança estrutural relevante atualiza este arquivo e/ou ADR.
28. **PR só pode ser entregue como pronto fora de rascunho e com todos os testes/checks verdes no commit final.** Rascunho temporário durante o trabalho é permitido, mas deve ser convertido antes da entrega. Após o último push, aguardar os checks terminarem e conferir o SHA validado; ausência de checks, estado pendente ou sucesso em commit anterior não equivalem a aprovação. Não remover workflows, desabilitar testes ou enfraquecer gates para obter verde. Se um impedimento externo estiver fora do controle do agente, informar explicitamente o impedimento e o estado real, sem declarar o PR pronto.
29. Demonstrações que injetam sessão simulada ficam exclusivamente em `tests/fixtures/`, com build separado de `dist/`. Nenhum query param, storage ou variável pública pode liberar sessão na aplicação; o build público é testado contra o endereço da fixture.
30. O planejamento visual segue ADR 006, `docs/research/visual-direction.md` e `docs/research/backlog-visual.md`; os ADRs 014–018 e as issues devem permanecer coerentes. Paridade com o monólito é de tarefas e dados, não reprodução de sua aparência. Mudança de direção atualiza especificação e aceite afetados antes da implementação.

31. O escopo vigente segue ADR 019, `docs/API-CONTRACTS.md` e os corpos canônicos em `docs/backlog/`. Cada capacidade distingue main/versionada, PR aberto, planejada e lacuna; monólito não é inventário exclusivo. Gerar tipos de uma versão integrada pinada, nunca de união manual de branches. O manifesto e as issues remotas devem corresponder.
32. Sessão e acesso comercial são separados: 401 reautentica, 402 preserva leitura/exportação e entrada. Permissão por operação vem do contrato/servidor, não apenas do verbo HTTP. Titular, conta, casa e banca não são sinônimos; atribuição e troca temporal são decisões da API.
33. Resumo/gráfico/lista/exportação precisam de população compatível ou escopo explícito. `incluir_apagadas` não significa somente apagadas; não filtrar uma página para simular o conjunto. Refetch/fresh não força refresh de MV; valores nulos/desconhecidos não viram zero. Freebet mantém valor de face da entrada, com custo próprio decidido pelo servidor.

34. CI preserva budget JS inicial <=200.000 bytes gzip e cobertura >=80% por arquivo de lib/features/api/auth nas quatro métricas; arquivos não importados entram. Lighthouse mede build público mobile/desktop, sem confundir baseline com gates de release/INP. Publicar apenas dist e CSP do mesmo SHA, nunca fixture; ver ADR008.

35. Telas de conta (#12) encaminham apenas intents login/signup/recover do contrato hospedado. Senhas, confirmação e reenvio pertencem ao emissor, sem endpoints/formulários locais inventados. Cadastro não ativa assinatura. Retorno validado preserva filtros/seção, remove parâmetros de protocolo antes de renderizar e antes de persistir fragmento. Recuperação fora de intent=recover não promete revogação local. Prova real obrigatória inclui cadastro/recuperação pela SPA e confirmação expirada nos dois viewports, zero skips; ver `docs/contracts/conta.md`.
36. Boundaries de páginas protegidas ficam dentro de RequireSession/Shell; falha no guard/layout usa recuperação externa, sem consultar fila ou afirmar sessão. Retorno de erro usa catálogo e parâmetros não secretos, nunca histórico externo. Tentativa de abrir página é GET explícito, com bloqueio durante navegação/Retry-After; 404/405 e escrita incerta não oferecem repetição. Injeção de falhas somente no build de testes, nunca no aplicativo público; ver `docs/contracts/erros-de-rota.md`.

37. Acesso comercial (#52): `useAcesso().can(operation)` orienta ações e `run(operation, work)` revalida status antes da escrita. Nenhuma escrita depende de data local, URL/storage ou cache antigo. Exceções explícitas estão em `src/features/acesso/operations.ts` e `docs/contracts/acesso.md`; servidor prevalece. 402 publicado invalida confirmação de acesso, preserva formulário e sessão, sem repetir a intenção após pagamento. Não envolver sessão em gate de billing. Builds de demonstração continuam isolados conforme regra 29.

38. Conexão Telegram (#54): código de uso único existe somente em memória do componente, nunca no cache de queries, URL, storage ou telemetria. Copiar exige gesto explícito; expiração, vínculo confirmado e saída removem o comando. Polling de GET para após dois minutos ou erro; POST/DELETE não ganham replay. Revogação exige confirmação e consulta do estado atual. READ_ONLY permite as exceções publicadas de vínculo; Enviar permanece bloqueado para escrita. Até o lançamento, o link do bot é explicitamente fictício e interno, sem inventar endereço externo. Ver `docs/contracts/telegram.md`.

39. Configurações (#33): fuso das análises pertence ao usuário e persiste somente em GET/PATCH /painel/preferencias. Reutilizar FusoPreferencia em #57; não alterar formatação global de datas, valores ou vigências. Tema é a única preferência local. PATCH não ganha replay; resultado desconhecido exige GET explícito antes de nova intenção. Preferências sem contrato permanecem no planejamento, sem formulário fictício. Privacidade funcional pertence à #58; ver docs/contracts/configuracoes.md.

40. Lista operacional (#18): textos/contextos vêm da projeção em lote, sem N GETs de detalhe; referências registradas e nomes atuais são distinguidos. Resumo exige os mesmos seletores do servidor, sem soma/filtro de página local. Descritores de leitura e validadores são gerados do mesmo OpenAPI verificado que tipos/políticas. Candidata revisada é explicitada no manifesto e nunca aprovada pelo gate de publicação como integrada. Provas de branches diferentes usam builds/documentos inteiros separados, sem união manual ou afirmação de deploy conjunto. Ver docs/contracts/apostas.md.
