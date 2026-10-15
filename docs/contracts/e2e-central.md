# E2E central — versão candidata única (#23)

Decisão do titular em 11/10/2026: implementar e ensaiar as entregas pendentes como um conjunto antes dos merges administrativos, mantendo PR frontend diretamente contra main e dependências declaradas.

## Fonte e limites da prova

API real do sandbox: [f109655afa4721b239afc1c2c7593c5391cc047a](https://github.com/pradyumna-001/bancaemdia-api/tree/f109655afa4721b239afc1c2c7593c5391cc047a), com pai inicial main `b916f54331f14cf47a3800324bd61d8638043c06`. Reaplica código de #189/`22d5b77` (inclui #184), #187/`186be74` e #193/`71f1a1a`. Reconcilia lista/snapshot/filtros/projeção e SQL reutilizado; não reúne schemas. O OpenAPI inteiro é gerado pelo aplicativo real, 100 operações; SHA-256 `0affeabd26e27c30ffb9afcad0dd427c83d349e7be7ced22a898429e84e1d584`. Tipos, políticas e descritores são gerados juntos desse documento verificado.

Disponibilidade `sandbox_reconciliation` no manifesto, com commit completo, permalink, baseline e cabeças de origem imutáveis. A fonte é uma branch de ensaio, não main, PR backend entregue ou deploy. `requireIntegratedContract` recusa toda disponibilidade candidata; sua prova de ancestralidade permanece. O administrador mantém as revisões e os merges dos PRs originais.

Frontend: reaproveita #86 (fundação #85/#80 e Contas), #84 (lista compacta/detalhe), #88 (foto e suas provas), preservando a apresentação aprovada da conta #83. Reconciliam-se rotas, catálogo restrito de casas das Contas, pílulas únicas do Painel e link de foto no detalhe por chave/query. A foto não depende de hash ou revisão aberta. Erros simultâneos da lista e do resumo têm nomes acessíveis distintos; o teste da fila verifica especificamente o aviso da Revisão. Escopo próprio #23: esta reconciliação, manifestação da fonte candidata e testes/CI centrais. As telas e decisões financeiras continuam nos seus PRs independentes.

## Dados e jornadas reais

Seed por execução em PostgreSQL descartável, duas identidades de emissor real, sem dados/credenciais de produção. A população e os nomes são determinísticos; identificadores seguem respostas reais e UUIDs isolam execuções. Contas/titulares e cinco apostas são criados pela API; um legado sem contexto e uma conta sem titular são preparados no banco de testes. Há freebet, nulos, pendência, resultado confirmado e foto de revisão resolvida.

Dois fluxos em Chromium, Firefox e WebKit, cada um em 390×844 e 1440×900: 12 casos, quatro obrigatórios por navegador. A CI de identidade separada conserva seus 16 casos da SPA e nove backend.

- Lista, resumo, diário e hierarquia consultam a mesma população. Comparam-se valores fornecidos pelo servidor e snapshots por resposta, sem somar páginas ou calcular finanças no cliente. O resumo legado expõe o subtotal liquidado conhecido; os totais completos do diário/hierarquia explicitam pendentes/desconhecidos como null, e a prova não equipara esses escopos. Pendente/desconhecido continua null; face da freebet é preservada, com custo do servidor. O gate backend do Painel inclui XLSX/frescor/cursor/grupos completos.
- Filtros/query/pílulas, reload, histórico, modo compacto e paginação; duas contas da mesma casa produzem recortes distintos. Ativas/apagadas/todas usam `visibilidade` da API candidata; `incluir_apagadas` nunca é interpretado como somente apagadas. Contrato integrado antigo sem esse seletor conserva o bloqueio contextual da #17.
- Detalhe por chave → correção → histórico → foto após resolução → apagar → somente apagadas → restaurar. Nenhuma inferência por hash/casa, confirmação nas ações destrutivas e política de frescor explícita.
- Outro usuário não lê aposta, foto, lista ou titular privado. 402 preserva sessão e leituras, recusa escrita real sem replay; logout revoga cookie e os dados privados saem da página, com 401 na leitura seguinte. As provas anteriores cobrem troca de sessão, respostas atrasadas, Web Locks e limpeza de Blob.
- Axe no build público, teclado para abrir detalhe/foto, reflow320. O tema e os estados específicos continuam nas provas visuais herdadas, nos três navegadores/dois viewports. Fixtures/MSW são apresentação e não substituem esta jornada.

## Gates e execução

`.github/workflows/core-contract.yml` tem matriz dos três navegadores; cada job sobe API/emissor/SMTP/PostgreSQL/Redis descartáveis, usa dist/CSP públicos do mesmo SHA frontend e a única fonte backend acima. O job Chromium também executa os gates reais das quatro capacidades: filtros, Painel detalhado, oito invariantes de projeção e 42 provas de foto, cada inventário sem skips. Os workflows e critérios originais permanecem.

`tests/identity/check_core_results.py` exige exatamente os dois fluxos nos dois viewports, por navegador, sem caso ausente/duplicado, falha, erro ou skip. O gate de projeção exige seus oito invariantes. Timeout/falha não cria aprovação artificial. Traces começam após autenticação/seed, sem capturas/snapshots; antes de upload são retirados rede, recursos e resultados avaliados que possam conter dados de sessão. Restam ações, tempos e stacks para diagnóstico.

Local: `make lint && make typecheck && make test`, com orçamento e cobertura originais. A CI executa a jornada real além da suíte visual completa. Firefox local não inicia neste Windows (`spawn UNKNOWN`); a matriz Linux mantém Firefox obrigatório. Isso não cria skip nem aprovação de execução local inexistente.

## Após o administrador integrar

Reconciliar os trechos comuns com #184/#187/#189/#193 e as telas #81/#84/#85/#86/#88. Obter o OpenAPI inteiro do novo SHA backend integrado, regenerar tipos/políticas/descritores, atualizar os dois workflows para esse único SHA, retirar a disponibilidade candidata somente com ancestralidade comprovada e repetir todas as jornadas/gates. A prova de sandbox não publica nem substitui essa revalidação.

## Revisão #28 — 15/10/2026

Sandbox fornecido pelo backend 547a4d0cfce5308dfe71221a77ad6fd5eb6e47cd incorpora #201 ao b37a3f8, preserva as 120 operações anteriores e publica 125. Hash OpenAPI 09cf9fbb4b46a8dfc20fc4f4a3c97c3b88000612308cfb4e1e8fd4565901854a. Sem união de schemas, promoção ou publicação. Acrescentam-se 56 aceites PostgreSQL e seis jornadas reais Revisão nos três browsers/dois viewports, preservando inventários anteriores. O job central reserva 25 minutos para o inventário ampliado; limites de teste/pedido, cobertura, budget JS e zero skips permanecem. Detalhes em docs/contracts/revisao.md.
