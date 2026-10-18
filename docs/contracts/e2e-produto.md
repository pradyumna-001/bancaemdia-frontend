# Produto conjunto — #36

## Versão de ensaio

Frontend reúne as dependências da #59/PR #103 e recupera os consumidores já revisáveis
de Calculadoras (#55/PR #78) e Hipotética (#21/PR #87), que não estavam na árvore
conjunta. Assinatura já estava presente; seus testes de interface também são
recuperados da #51/PR #77. São dependências declaradas contra main, sem merge
administrativo. A reconciliação usa carregamento lazy para manter o budget inicial.

API real única: `25825111bc84126eb48841641adbb47385becf4f`, filha do pin completo
`5f5f06276114d35e062db45bc54c61c4cb6fc3ec`. Acrescenta o código da Hipotética de
backend #191/`552c4ffe3924df3eac2caa50ea4f5df4c553b816`. As 128 operações e todos os
schemas anteriores são idênticos; a operação nova produz 129 no total. O documento
inteiro é gerado pelo aplicativo real, SHA-256
`04f091f45b327f4fe87d629afa0a2df4fca84674686fd4e145be35bb0b0460dd`.
Tipos, políticas e descritores vêm desse documento, sem união de schemas.
Proveniência: `config/api-contract.json` e `docs/contracts/sandbox-produto-36.md`
na árvore API. A disponibilidade permanece `sandbox_reconciliation`.

## Matriz e evidências

A [matriz por capacidade](../validation/produto.md) distingue apresentação simulada,
SPA/API reais e integrações externas pendentes. Todos os workflows anteriores são
preservados e apontam para o mesmo pin. O suplemento `product-contract.yml` acrescenta:

- 16 percursos de identidade/sessão/conta/recuperação/comercial/Telegram/fuso/foto
  por navegador, agora também em Firefox e WebKit. A seleção do navegador existe
  somente no harness de testes. Em READ_ONLY as quatro calculadoras são usadas
  pela SPA e comparadas às respostas reais, além de 402, leitura e exportação.
- Quatro percursos Casa × Telegram por navegador: ambas as ordens de chegada em
  390×844 e 1440×900. Envelopes sintéticos passam pelos intake/workers reais;
  PostgreSQL mantém duas fontes, uma relação ativa e um fato financeiro. Reentrega
  e liquidação não duplicam o fato. Lista, resumo, diário e grupos consultam a
  população canônica, e o detalhe preserva a consolidação. O navegador não soma
  ou deduplica dinheiro. A amostra não certifica um leitor de casa real.
- Dois percursos Hipotética por navegador: stake indicada diferente, odd/resultado
  reais, população/centavos exatos, READ_ONLY, isolamento, fatos/eventos/Caixa
  imutáveis e logout. Recuperam a prova do PR #87 na árvore completa.
- Aceites PostgreSQL da Hipotética e consolidação, além dos inventários anteriores
  de filtros, foto, Painel, resultados, prints, planilha, revisão e criação manual.

O suplemento tem 22 casos por navegador (66 por evento). Os 106 percursos anteriores
continuam obrigatórios: 16 de identidade e 90 das matrizes operacionais. Há 172
execuções reais por evento, com repetição deliberada de identidade Chromium para
preservar o gate original. Esse número conta execuções, não tarefas independentes
nem certificação de lançamento. Zero skips/falhas/erros em cada inventário obrigatório.

O gate exige nomes exatos, ambos os viewports, todos os arquivos e unicidade; arquivo
ausente/duplicado, outro navegador ou skip não passa. O relatório JSON contém apenas
SHAs, hash do contrato, disponibilidade, navegador, viewports e contagens. Traces
começam após autenticação/seed e passam pelo sanitizador e gate independentes antes
de upload: sem argumentos, resultados, rede, recursos ou storage. Segredos, códigos
de vínculo e URLs de protocolo não são evidência publicável.

Banco, identidades, processos e chaves são descartáveis e isolados por caso. Expiração
usa o relógio real do banco e espera o prazo publicado. Falhas de rede cortam a resposta
depois do commit real; não fabricam JSON, resultado financeiro ou confirmação. Nada
usa pagamento, aposta ou conta reais. Reflow320, dois temas, teclado/foco e axe são
mantidos nas suítes de interface e conferidos nos fluxos reais pertinentes.

## Limites e lançamento

Este ensaio pode ser concluído antes dos merges, por decisão do titular. Não é versão
integrada em main nem autorização de produção. #38 continua bloqueada pelo pin e
pela revisão administrativa; deve repetir as jornadas após obter um único pin integrado.
Distribuição da extensão e bot público permanecem aguardando lançamento, conforme
#35/#54. O escopo de captura real, leitor/host e expansão API #118 não é substituído
pelos envelopes sintéticos da consolidação. Checkout/portal externos, preços comerciais,
homologação do emissor e infraestrutura pública têm seus próprios aceites.

Falha obrigatória impede entrega pronta. Uma pendência externa não é convertida em
skip, sucesso de mock ou anúncio de release completo. A #37 medirá performance e
acessibilidade de release; #39 fará a auditoria final antes da #38 publicar.
