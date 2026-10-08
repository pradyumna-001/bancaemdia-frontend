# ADR 007: Testes de tarefas, contratos e release

## Status

Revisado pelo ADR019 em 29/09/2026. Preserva a CI existente e amplia o escopo do produto.

## Camadas

Vitest/Testing Library para regras de apresentação e componentes; fixtures/MSW conformes ao OpenAPI pinado; Playwright Chromium/Firefox/WebKit em 390×844 e 1440×900. Lints de tokens/ícones, build e geração sem drift permanecem. Mocks não comprovam integração; cenários de release usam API/emissor descartáveis compatíveis. Cobertura V8 obrigatória >=80% por arquivo em linhas/statements/funções/branches de lib/features (#8), inclusive arquivos não importados, geometria de gráficos testada sem recalcular domínio.

## Jornadas de release

1. Cadastro/login/provisionamento, expiração/renovação/logout e cache isolado.
2. Cartão/retorno Checkout/status, teste confirmado, leitura/402, portal/cancelamento e exportação.
3. Titular/conta, matriz/histórico, ativar e trocar no instante T; não atribuídas visíveis.
4. Filtros/pílulas/URL/reload, página e somente apagadas; resumo da mesma população.
5. Detalhe/correção, apagar/restaurar, freebet com face preservada e concorrência.
6. Resultados: 20 simples em 20 toques; duplo toque seguro, desfazer sem sobrescrever alteração recente.
7. Upload Telegram → progresso → resultado, parcial/limite/zero apostas, sem estimativa/aviso de custo de processamento nem aprovação de gasto (ADR019, decisão de 06/10/2026); prints e XLSX prévia/confirmar sem duplicidade.
8. Revisão por motivo: leitura com/sem foto, conta, par e zerar fila mantendo saída.
9. Caixa: depósito/retry, transferência atômica, saldo desconhecido, extrato e conta alheia.
10. Bot: código/vínculo/expiração/revogação; extensão: instalações independentes e credenciais temporárias. Matching/v2 só quando contratos integrados.
11. Painel, análises, metas/fuso: lucro separado de caixa, null/desconhecido e frescor explícitos.
12. Quatro calculadoras: cenários da API, entradas inválidas e resposta obsoleta descartada.
13. Privacidade: exportação real, encerramento e 409 assistido, sem prometer binários/reset.
14. 401/402/409/413/422/429/503/offline/timeout; sem loops, vazamento ou estado morto.
15. Sistema/Claro/Escuro, sem flash, storage bloqueado, teclado, zoom, foco, reflow320 e alternativas dos gráficos.

## Gates e evidência

A #17 acrescenta testes de codec/fuso/DST e componentes reutilizáveis, com Playwright nos três navegadores e dois viewports para contexto, pílulas, histórico, reload, teclado/foco, temas, axe e reflow320. Fixture não entra no build público. A prova real pinada verifica filtro por estado, intervalo, paginação, isolamento e inclusão de apagadas com exclusão/restauração descartável; não certifica somente apagadas/catálogos/população equivalente ausentes. Bloqueios continuam na #50/#17, sem skip ou promoção de OpenAPI inválido. Ver [contrato e limites](../contracts/filtros-url.md).

- Antes de push: make lint, typecheck e test. CI completa e segurança verdes no SHA final; PR fora de rascunho. Não remover gates nem pular falhas para declarar pronto.
- E2E nos três browsers e dois viewports, capturas e traces sem segredos. Axe nos cenários pertinentes e revisão manual complementar; não confundir com certificação completa ou teste com participantes.
- Orçamento de bundle/performance conforme ADR001 e #8/#37. Paralelismo só com dados isolados e medição.
- #23 cobre núcleo, #30 entrada, #36 conjunto. #39 audita antes de #38 publicar; não há dependência circular entre auditoria e publicação.
- Dependência backend ausente permanece bloqueio, não um cenário skipped que aprova release. Adiamento exige decisão explícita do escopo.
- #49 acrescenta CI de contrato com uma versão completa pinada do backend PR #168, Keycloak/SMTP/PostgreSQL/Chromium reais e dist/CSP públicos da SPA nos dois viewports. Gates exigem zero skips; não promove schema de PR aos tipos públicos. Valida transporte e contrato, mantendo sessão/telas da #11/#12 e homologação do emissor produtivo como entregas distintas. Ver [prova e limites](../identity-validation.md).
- #9 estende os mesmos gates por arquivo (quatro métricas >=80%) a `src/api/`, excluindo testes e `.d.ts`. MSW verifica transporte sobre paths/shapes da versão integrada, incluindo cancelamento, deadlines, bytes/multipart e chave estável. Testar HTTP402 não declara billing integrado; fixtures não comprovam sessão ou contratos ausentes. Hash do OpenAPI e políticas geradas têm gates próprios sem relaxar a CI existente.
