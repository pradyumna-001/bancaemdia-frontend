# Gráficos SVG — issue #7

`GraficoEvolucao` e `BarrasLucro` recebem os tipos gerados `EvolucaoSaida` e `GrupoSaida`. A API fornece lucro acumulado, lucro por grupo e quantidade; o cliente calcula apenas coordenadas e dimensões. Não há soma financeira, agregação de bancas, interpolação de dados ou biblioteca de gráficos.

## Leitura e geometria

- Evolução ordena cópia dos pontos por data civil UTC; distâncias horizontais seguem dias de calendário. Zero participa do domínio vertical, inclusive em séries inteiramente positivas/negativas. Um ponto fica centralizado; série zerada tem zero no centro. Datas inválidas/repetidas e mistura de bancas geram erro seguro em vez de uma linha enganosa.
- Barras partem de um zero compartilhado, com direção pelo sinal e comprimento proporcional ao valor absoluto. Espessura é `k × √n`, com a mesma constante para todos os grupos; não há piso que distorça a proporção. Quantidade zero resulta em espessura zero e texto disponível.
- Títulos, período, unidade, sinais e legendas complementam a cor. Optou-se por linha sem preenchimento para reduzir competição com os pontos e o eixo zero. Rótulos ficam em HTML legível, sem encolher com o SVG.
- Leitura detalhada abre por foco, ponteiro ou toque e pode ser dispensada por Escape, inclusive após hover; mover o ponteiro até a leitura não a apaga. Tabelas HTML permitem conferir todas as observações, inclusive pontos próximos em séries densas. Tabelas largas têm rolagem contida e região focável.
- Centavos usam `src/lib/format.ts`, antecipando somente o formatador necessário da #16. A exibição usa BigInt para não arredondar centavos próximos ao limite seguro do JSON. Valores fora de `Number.isSafeInteger` são rejeitados; isso não substitui a definição de transporte de BIGINT na API. Os demais formatadores/termos continuam na #16.

## Demonstração e limites

`/sistema` continua protegido pelo guard e exibe aviso explícito de dados fictícios. Cenários: comparação com sinais mistos/datas espaçadas, vazio, um ponto, zero e extremos. Não é uma tela financeira nem consulta dados da conta. Integração com filtros/queries, carga de dados e Painel permanece nas respectivas issues; estes componentes recebem dados já disponíveis e tratam vazio/inválido.

A fixture isolada da #6 permite revisar a página antes do login real:

```sh
pnpm exec vite build --config tests/fixtures/shell.vite.config.ts
pnpm exec vite preview --config tests/fixtures/shell.vite.config.ts --host 127.0.0.1 --port 4176 --strictPort
```

Abrir `/sistema` nesse servidor. Nunca publicar a fixture; a aplicação normal continua exigindo sessão. Não executar builds concorrentes em `dist/` durante Playwright.

## Verificação

- Unitários de escala/zero, direção e proporções, √n, calendário/bissexto, ausência de mutação/acumulação, dados inválidos, extremos, formatação exata, estados de tela e tooltip dispensável/persistente.
- Gate de dependências rejeita bibliotecas de gráficos conhecidas.
- Playwright nos três navegadores e nos dois viewports: teclado, interação, alvos dos pontos, tabelas, temas, axe e guard de `/sistema`. Verifica vazio/um ponto/zero/extremos e reflow a 320px, sem NaN/Infinity no SVG.
- Capturas `graficos-Claro.png`, `graficos-Escuro.png` e `graficos-extremos.png` nos artefatos de CI. Inspeção visual complementa axe; não constitui estudo com participantes.

Resultados finais e SHA validado ficam no PR da issue. Nenhum teste existente foi removido ou ignorado.
