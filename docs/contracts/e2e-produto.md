# Produto conjunto — #36

## Versão de ensaio

Frontend reúne as dependências da #59/PR #103 e recupera os consumidores já revisáveis
de Calculadoras (#55/PR #78) e Hipotética (#21/PR #87), que não estavam na árvore
conjunta. Assinatura já estava presente; seus testes de interface também são
recuperados da #51/PR #77. São dependências declaradas contra main, sem merge
administrativo. A reconciliação usa carregamento lazy para manter o budget inicial.

API real única: `37b130282c0d4a240f152b72fc76933074f38e4e`, descendente do pin completo
`5f5f06276114d35e062db45bc54c61c4cb6fc3ec`. Acrescenta o código da Hipotética de
backend #191/`552c4ffe3924df3eac2caa50ea4f5df4c553b816`. As 128 operações e todos os
schemas anteriores são idênticos; a operação nova produz 129 no total. O documento
inteiro é gerado pelo aplicativo real, SHA-256
`04f091f45b327f4fe87d629afa0a2df4fca84674686fd4e145be35bb0b0460dd`.
Tipos, políticas e descritores vêm desse documento, sem união de schemas.
A reconciliação inclui a política HTTP da #191 para Hipotética, preservada
junto ao Painel filtrado nos dois modos de identidade: Cache-Control
private/no-store e Vary Authorization/Cookie, inclusive em erros. Os aceites
PostgreSQL originais e a regressão isolada de transporte são obrigatórios.
Proveniência: `config/api-contract.json` e `docs/contracts/sandbox-produto-36.md`
na árvore API. A disponibilidade permanece `sandbox_reconciliation`.

## Matriz e evidências

A suíte visual ampliada tem 942 execuções. O limite global do job de qualidade é
40 minutos para incluir instalação/build, a matriz inteira e os gates finais de
hooks/nginx/Docker: a rodada de 930 casos levou 28min55s antes desses gates finais.
Isso dimensiona a execução total; mantém os limites de cada caso/asserção,
zero retries no Playwright, inventários completos, cobertura e budget de produção.

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

Consolidação e Hipotética são executadas sequencialmente como provas independentes:
uma falha na primeira ainda permite diagnosticar a segunda. Os códigos de saída e
o inventário XML continuam obrigatórios; qualquer falha reprova o job. Não há
`continue-on-error`, skip ou aumento dos limites de cada caso/asserção.

O primeiro foco de um documento recém-carregado usa a consulta inicial do guard;
não dispara outra conferência que esconda o controle no primeiro clique. O retorno
à janela só revalida após um `blur` observado nesse documento. A revalidação por
visibilidade, os eventos entre abas e as consultas dentro do Web Lock permanecem.
Um retorno real `blur` → `focus` continua cancelando respostas privadas antigas e
não repete mutations. As provas distinguem primeira ativação de retorno à janela.

Nos percursos com várias janelas, a janela é trazida à frente antes de navegar
para a ação privada. Isso separa a seleção da janela do clique da tarefa, sem
suprimir o evento de foco ou a revalidação real de sessão. Saída exige também
POST 200/`logged_out=true`; foto de outro usuário exige GET 404 antes da mensagem
da interface. Cada ação mantém um clique, sem replay, sleeps, cliques forçados ou
mudança dos timeouts. Os aceites de sessão, isolamento e interface são preservados.

Banco, identidades, processos e chaves são descartáveis e isolados por caso. Expiração
usa o relógio real do banco e espera o prazo publicado. Falhas de rede cortam a resposta
depois do commit real; não fabricam JSON, resultado financeiro ou confirmação. Nada
usa pagamento, aposta ou conta reais. Reflow320, dois temas, teclado/foco e axe são
mantidos nas suítes de interface e conferidos nos fluxos reais pertinentes.

## Limites e lançamento

O helper de estresse da API gera IDs int64 arbitrários. O percurso web usa IDs
de diálogo dentro da [faixa publicada pelo Telegram](https://core.telegram.org/api/bots/ids),
sem alterar as provas de estresse do servidor. Inteiros JSON inseguros continuam
sendo recusados pelo transporte, inclusive em contexto de consolidação; nunca
são arredondados. Um caso visual dedicado exige erro seguro e contraste no botão
de recuperação em hover/foco, nos dois temas. O percurso real também espera o
título do detalhe carregado antes de auditar a página, para comprovar a UI de sucesso.

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
