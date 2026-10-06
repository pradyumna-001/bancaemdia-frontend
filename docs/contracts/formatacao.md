# Apresentação de valores e termos — #16

Os formatadores de `src/lib/format.ts` apresentam valores prontos. Não calculam lucro, saldo, retorno, ROI, stake, câmbio, desconto, prazo de trial ou preço. `src/lib/termos.ts` é o vocabulário local, incluindo estados tipados pelo enum `Resultado` do OpenAPI. Os nomes das abas reutilizam essa fonte sem alterar rotas ou filtros.

## Precisão e ausência

`moeda` recebe centavos BRL; `moedaMenor` recebe inteiro em unidade menor e moeda. Aceitam número JSON seguro, bigint ou texto inteiro canônico. Número inseguro, fracionário ou malformado é recusado com erro local em português; não se recuperam dígitos já perdidos pelo JSON. Strings/bigints permitem apresentar os limites BIGINT do servidor sem float. Entradas excessivamente longas são recusadas (inteiro até 129 caracteres, decimal até 256 e deslocamento até 128 casas).

O símbolo, separadores e escala pertencem ao formatador. Divisão para apresentação fica apenas nele. `moeda` conserva o resultado da #7, incluindo sinal Unicode e centavos exatos. `moedaEixo` continua compacto/aproximado exclusivamente nos eixos; tabela e resumo usam valor exato.

`null` produz “Não informado”, nunca zero. `ValorFinanceiro` exige campo explícito: Valor de face, Custo próprio, Retorno, Lucro ou Saldo. Renderiza o valor recebido para aquele campo, sem completar outro por subtração. Freebet pode mostrar face positiva e custo próprio zero; lucro/retorno continuam valores independentes da API. Entrada inválida mostra “Valor indisponível” no componente sem corpo cru ou exceção na tela.

## Decimais e porcentagem

`decimal` e `odd` preservam todas as casas recebidas, inclusive texto decimal além da precisão do Number. Notação científica é expandida textualmente; não há arredondamento ou truncamento. Odd tem pelo menos duas casas para leitura consistente, sem decidir validade comercial. Number finito dentro da precisão segura é apresentado como recebido; formatação não restaura precisão anterior à serialização.

`porcentagem` recebe **razão pronta** (0.125 → 12,5%). `porcentagemPontosBase` recebe campo **basis_points pronto** (1250 → 12,50%). Apenas deslocam a unidade de apresentação; não recebem lucro, giro ou quantidade para calcular uma taxa. Consumidor deve escolher a função pela unidade publicada, sem aplicar nova multiplicação antes dela.

## Preços de assinatura

`moedaMenor` usa moeda ISO conhecida e escala do Intl, ou uma escala explicitamente recebida pelo consumidor. Não presume duas casas para JPY/KWD nem aceita código desconhecido como se fosse BRL. Não converte moedas.

`precoAssinatura` apresenta os argumentos primitivos `amount_minor`, `currency` e `frequency` já publicados. MONTHLY/ YEARLY tornam-se “por mês”/“por ano”; preço ausente ou periodicidade desconhecida não vira plano inventado. A política de escala dessa função é de **cobranças Stripe**, incluindo ISK/UGX com duas casas e MGA sem casas. Não reutilizá-la para payouts ou outro provedor sem revisar o contrato; `moedaMenor` continua genérico.

Referências verificadas em 06/10/2026: [projeção billing da main backend 8d5aea6](https://github.com/pradyumna-001/bancaemdia-api/blob/8d5aea6bf4c9c99581910a8b1a2ed8c19edc65b8/src/bancaemdia/api/v1/billing.py), [modelo de preços](https://github.com/pradyumna-001/bancaemdia-api/blob/8d5aea6bf4c9c99581910a8b1a2ed8c19edc65b8/src/bancaemdia/models/billing_price.py), [unidades e exceções Stripe](https://docs.stripe.com/currencies), [CurrencyDigits/ECMA-402](https://402.ecma-international.org/#sec-currencydigits). Não há shape de resposta manual, endpoint novo, catálogo local ou promoção de schema: o pin do cliente continua `bd055417459f796fed960b5b37efb33a9744419f`. Integração comercial permanece nas #51/#52 e atualização controlada do contrato.

## Datas e estados

`dataCivil` recebe YYYY-MM-DD e valida calendário/ano, sem converter para fuso. `dataHora` exige instante com offset/Z e fuso explícito válido; exibe o fuso junto à hora. Nunca usa o fuso implícito do navegador, nem aceita datetime sem offset ou dia normalizado silenciosamente pelo Date. Frações de segundo não são mostradas; o instante usado permanece o recebido. Formatação de datas não altera prazo ou permissão.

`EstadoAposta` comunica cada estado em texto, inclusive Meio green/Meio red. Valor desconhecido não vira Pendente, não expõe texto cru e não decide resultado financeiro. Titular, conta, banca e assinatura conservam nomes distintos.

## Verificação e limites

Lint AST proíbe Intl.NumberFormat/DateTimeFormat fora do formatador e aritmética sobre identificadores financeiros fora dele. A única exceção é a geometria SVG existente, que escala valores prontos; essa permissão não autoriza agregações financeiras. Casos negativos de lint fazem parte dos testes. Continuação de cobertura/budget/OpenAPI/e2e/segurança mantém os gates da main.

Testes verificam limites inteiros, zero, null, decimal longo, unidades 0/2/3, exceções de cobrança, calendário, fuso, estados parciais e proteção de precisão. Ensaio de componentes em `tests/fixtures/shell/ValoresPage.tsx` verifica temas, teclado, Axe e reflow 320 nos dois viewports; build público recusa seu endereço. Não é tela financeira, preço ofertado, sessão ou homologação real. A #16 entrega primitivas/componentes para as consumidoras; #14/#49 continuam dependentes de ambiente público e identidade integrada.
