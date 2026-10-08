# Calculadoras — #55 / ADR019

## Versão e escopo

Quatro operações na árvore integrada `pradyumna-001/bancaemdia-api@b916f54331f14cf47a3800324bd61d8638043c06`, OpenAPI SHA-256 `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a`, já pinada na #52. Backend #103/PR #156 integrado. Não usa candidato #184. PR frontend independente contra main `b5fb27d197b4129c98c896232517e841bf8abca9`; incorpora separadamente #52/PR #76, formatadores #16/PR #69 e arquivo pós-lançamento PR #70. Reconciliar sobreposições após revisão/integração. Não depende da tela Assinatura #77.

POST `/api/v1/calculadoras/{mercado-justo,distribuir-entre-resultados,cobertura-ao-vivo,percentual-banca}` autentica, é stateless e não grava apostas. Backend permite as quatro consultas em READ_ONLY. Cookie/CSRF/época e matriz de acesso continuam obrigatórios; permissão não deriva de verbo HTTP/status de assinatura.

Requests/resposta vêm dos tipos gerados. `CalculationResponse.data` é mapa de `JsonValue` no OpenAPI; apresentação valida campos/unidades/método em runtime sem declarar DTO financeiro manual. Resposta incompleta, unidade incorreta e premissa/aviso desconhecido produzem erro seguro, sem número fabricado. Labels locais traduzem os métodos, precisão, arredondamento e notas conhecidos da versão pinada.

## Entrada e apresentação

Ferramenta vive em `?ferramenta`, default seguro Mercado justo. Links acessíveis preservam contexto/histórico; filtros de outras áreas não são enviados ao cálculo. Entradas ficam somente em memória. Navegação em andamento bloqueia POST da ferramenta anterior.

Odds/percentuais são strings decimais exatas, aceitando vírgula e sem expoente/milhar. Dinheiro entra em reais com até dois dígitos após a vírgula; `centavosDaEntrada` no formatador único transforma a representação por BigInt em inteiro seguro, sem float/arredondamento. Servidor valida limites financeiros/odds/comissão/modalidade. Não derivar lucro, probabilidade, margem, rateio, cobertura, ROI, soma de cenários ou percentual no browser.

Mercado justo/distribuição permitem 2–20 resultados, confirmação explícita de completude (não comprovável pelas odds), nomes distintos e ordem preservada; remoção tem desfazer. Sem margem não significa previsão real. Distribuição apresenta todos os cenários/indicadores recebidos, inclusive perda/zero e arbitragem que desaparece no arredondamento, sem agregação local.

Cobertura fixa cash/two_way, com comissão explícita; freebet/cashout parcial/devolução asiática não são suportados. Retornos/lucros, valor ideal e diferença de arredondamento vêm da API; `moedaCentavosDecimais` apresenta frações em centavos sem arredondar novamente. Percentual exige banca digitada, sem saldo escolhido automaticamente; envia somente percentage ou stake_centavos conforme modalidade. Null/ausência não viram zero.

## Concorrência e recuperação

Um submit gera um POST, sem retries automáticos. Edição, troca, parada, unmount e logout cancelam observação/descartam resposta antiga por sinal, versão e época. Parar não promete interromper cálculo no servidor. Resultado anterior sai imediatamente e entrada permanece. Resposta do mercado exige mesma ordem/nomes consultados.

409, resultado desconhecido ou parada pausam a intenção atual; editar ou escolher outra ferramenta inicia nova intenção explícita. Clicar na ferramenta atual não libera repetição. Retry-After bloqueia inclusive após edição/troca. 422 usa só loc seguro/labels, sem msg/input/ctx. Resultado recebe foco; tabelas têm foco/rolagem contida para teclado. Método/precisão/arredondamento/premissas têm detalhes acessíveis; avisos ficam visíveis.

## Evidências e limites

`tests/fixtures/calculadoras-golden.json`: 11 vetores produzidos por chamadas ao domínio extraído por `git show` do commit acima (mercado de dois/três resultados, distribuição com lucro/perda/centavo, cobertura com comissão/zero, percentual direto/inverso/zero). Não foram calculados pelo frontend. Unitários validam apresentação/corpo/CSRF, inválidos e concorrência/sessão.

E2E público: três navegadores, mobile/desktop, temas, axe/teclado/foco/reflow320, quatro operações em READ_ONLY, corpos exatos, erros/prazos e ausência de bypass. Prova OIDC/PostgreSQL percorre as quatro ferramentas na SPA real em READ_ONLY nos dois viewports, com backend/CSP reais; dez cenários SPA/nove backend, zero skips.

Prévia simulada exclusiva em `tests/fixtures/calculadoras/`, build `dist-calculadoras-fixture/`; aceita apenas exemplos golden identificados, não calcula entradas novas. Publicar somente dist/CSP do mesmo SHA aprovado. [Linhas permanece arquivada para pós-lançamento](../archive/post-launch/line-calculator.md).
