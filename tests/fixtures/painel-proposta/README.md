# Painel — proposta visual para a #20

Preparação de revisão, não implementação de domínio. A #20 exige validar a proposta mobile/desktop antes de implementar a hierarquia e o diário. Esta página vive exclusivamente em `tests/fixtures/`; não cria sessão, endpoint, DTO de resposta ou rota no build público.

Usa Logo, ABAS, Icone, fonte/tokens e formatadores existentes. As únicas operações sobre valores são geometria: posição/comprimento proporcionais ao valor e espessura proporcional à raiz da quantidade. Os números são exemplos fixos; os dias usam amostras repetidas deliberadamente e não comprovam conciliação financeira.

## Revisar

- Resumo com lucro do período separado do saldo all-time desconhecido/parte conhecida.
- Total de grupo sempre visível; expansão por teclado ou toque, vários filhos, sinais mistos e tipster em dois grupos. Parcela sem grupo não desaparece.
- Diário com data, valor, quantidade e estado persistentes, sem hover. Intervalos de 14 dias e lista alternativa de todos os 90 dias; escala visual mantida entre intervalos.
- Mobile: grupos antes do diário; desktop: comparação lado a lado. Reflow de 320px, tema claro/escuro e alvos de toque de 44px.
- `?trecho=0…6` seleciona o intervalo; inválido usa o padrão. Navegação entre áreas leva ao preview da #19, não simula telas ainda não implementadas.

## Executar separado

`pnpm exec vite build --config tests/fixtures/painel-proposta.vite.config.ts`

`pnpm exec vite preview --config tests/fixtures/painel-proposta.vite.config.ts --host 127.0.0.1 --port 4197 --strictPort`

Abrir `http://127.0.0.1:4197/painel`.

`pnpm exec playwright test --config tests/fixtures/painel-proposta.playwright.config.ts`

Verificação local da proposta: Chromium e WebKit, celular/desktop, claro/escuro, teclado, todos os 90 dias, query inválida, axe e reflow 320px: 12 casos aprovados. Firefox foi tentado, mas o executável local não inicia: o Windows reporta configuração lado a lado incorreta (falha anterior à abertura da página). Os seis casos de Firefox continuam no arquivo, sem skips; precisam rodar em ambiente com o navegador funcionando. Este ensaio visual não substitui os gates da implementação real.

## Bloqueio do contrato — 10/10/2026

Main backend `b916f54` e PRs #184/#187 não publicam a árvore grupo→tipster nem diário verdadeiro nos períodos longos. A função `granularidade_do_periodo` usa semana em 90d e mês em 1y/all. Não há issue backend dedicada encontrada na auditoria. O [pedido de emergência](../../../docs/requests/backend-painel-20.md) detalha a parcela faltante e a entrega necessária; ainda é um prompt para encaminhar, não uma issue/PR backend publicada.

A branch frontend parte de main e conserva as dependências revisadas de #84/#81/#83 para preparar a próxima entrega. Não existe PR pronta da #20, não há `Closes #20` e a prévia não satisfaz integração. Após a entrega backend e revisão visual, gerar de um documento inteiro aprovado e implementar/provar a jornada real, com dependências declaradas e todos os gates verdes no HEAD final.
