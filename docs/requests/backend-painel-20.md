# Pedido ao backend — emergência para concluir o Painel do site (#20)

Você está trabalhando no repositório `pradyumna-001/bancaemdia-api`. Crie uma issue emergencial para as lacunas abaixo, implemente-a e publique uma PR independente contra `main`, com as dependências declaradas. Não espere a próxima rodada de expansão nem faça merge administrativo. O administrador decide a integração.

## Problema e evidência

O frontend precisa concluir [#20](https://github.com/pradyumna-001/bancaemdia-frontend/issues/20), cujo aceite exige **lucro por grupo, tipsters dentro de cada grupo e lucro de cada dia, inclusive em períodos longos**. Não podemos construir essas informações no navegador nem retirar as jornadas do escopo.

Auditoria de 10/10/2026:

- Main backend: `b916f54331f14cf47a3800324bd61d8638043c06`.
- PR #184, HEAD `9b42a3579518a84d348d272afbaeff88f9119825`, entrega filtros/catálogos/população equivalente para o site. Continua aberta; é dependência relacionada, não uma entrega da hierarquia ou do diário obrigatório.
- PR #187, HEAD `186be7482437eb5dd4b70914843dc6c5f90395f1`, entrega projeção da lista de apostas. Também aberta; não corrige estas lacunas.
- `src/bancaemdia/api/v1/painel.py`: `PainelSaida` publica `por_casa`, `por_tipster`, `por_mercado` e `evolucao`. O tipo genérico `GrupoSaida` é uma linha de agregação, não o grupo de origem com seus tipsters filhos.
- `src/bancaemdia/domain/painel.py`, função `granularidade_do_periodo`: `7d`/`30d` usam dia, `90d` usa semana e `1y`/`all` usam mês. `EvolucaoSaida.lucro_periodo_centavos` já existe e deve ser reaproveitado onde sua granularidade e população atendem. Não criar uma segunda definição financeira de lucro.
- A busca nas issues abertas/encerradas não encontrou uma entrega dedicada ao diário de todos os períodos ou à hierarquia requerida. #105 já está encerrada/integrada; suas análises e heatmap por dia da semana não satisfazem essas duas jornadas.

Confirme os HEADs e a disponibilidade novamente antes de implementar, pois o administrador pode integrar ou alterar as PRs relacionadas.

## 1. Grupo de origem → tipsters

Entregar uma projeção autenticada e documentada que permita:

1. Mostrar cada grupo com identidade canônica, nome, lucro/prejuízo total e quantidade de apostas. Grupo não é casa, banca, titular ou conta.
2. Expandir o grupo e mostrar seus tipsters, com identidade, nome, lucro/prejuízo e quantidade referentes **às entradas daquele grupo**.
3. Preservar fatos sem grupo, sem tipster ou com atribuição desconhecida. Essas parcelas precisam de representação explícita e não podem desaparecer nem virar zero fictício.
4. Um tipster pode aparecer em vários grupos. Os fatos não podem ser copiados para todos os vínculos do tipster. A relação deve partir da aposta/origem e da regra de atribuição do domínio; um cadastro atual de vínculos não autoriza reescrever origem histórica.
5. Totais, subtotais, contagens e a política de reconciliação pertencem ao servidor. Publique também o total do recorte compatível com os grupos e com o restante do Painel. Defina quando as parcelas reconciliam e como resultados desconhecidos/pendências afetam o total.
6. Nomes repetidos não são identidades. Defina o comportamento de nomes alterados, grupos inativos e origem histórica não resolvida.
7. Evitar N consultas por grupo/tipster no cliente. Preferir a projeção em lote; se houver paginação de grupos/filhos, publicar total do grupo independentemente da página e metadados/cursor/ordem estável suficientes para percorrer todo o conjunto.

Use os modelos, leitores e agregadores existentes. Não invente vínculos ou atribua apostas por similaridade de nomes. Se o dado de origem não estiver disponível para um fato, mantenha-o explicitamente sem atribuição.

## 2. Diário verdadeiro em todo período

Entregar uma série diária que permita ao site mostrar data civil, lucro do dia e quantidade, com sinal e valor sempre visíveis:

1. Funcionar em `7d`, `30d`, `90d`, `1y` e `all`, sem converter os dias em semanas/meses. A evolução acumulada atual pode conservar seu contrato; acrescentar a capacidade diária sem quebrar consumidores existentes.
2. Fornecer o lucro diário diretamente no servidor. O frontend não subtrairá pontos acumulados nem distribuirá um bucket semanal/mensal entre dias.
3. Definir critério temporal, fuso, limites inclusivos/exclusivos e ordenação. Nomear o critério real: data da aposta, data do jogo ou outra regra já decidida pelo domínio. Não chamar data de criação de data de liquidação. Se o fuso persistido em `/painel/preferencias` não se aplicar a esta projeção, informar o fuso real explicitamente; se passar a se aplicar, definir a compatibilidade e seus testes.
4. Distinguir dia sem atividade, zero confirmado, somente pendências/resultado incompleto e dado ausente. Null não é zero. Publicar os campos/estados necessários e documentar sua semântica; não basta retornar um vetor que omite todos esses casos sem regra de preenchimento.
5. Garantir acesso a todos os dias do período longo. Pode paginar por intervalos/cursor, com tamanho limitado e ordenação estável. Informar intervalo total, intervalo devolvido e como navegar anterior/próximo; não truncar silenciosamente nem exigir baixar um histórico ilimitado.
6. O total do período completo deve acompanhar a leitura de cada intervalo e conservar o contexto dos filtros. Distinguir total do período de subtotal da página, caso ambos existam. Não pedir soma financeira ao cliente.
7. Definir a população: apostas consolidadas, apagadas/restauradas, freebets, resultados parciais, origem, contas sem atribuição e demais seletores. Freebet preserva valor de face; o custo vem da regra do servidor.

## 3. Coerência com filtros, resumo, evolução e exportação

- Reutilizar o contrato/seletores da #183/PR #184 onde necessário. Não entregar o diário ou os grupos como agregado global quando a tela conserva um filtro de grupo, banca, conta, titular, apagadas etc.
- Informar quais filtros cada capacidade suporta, critérios temporais e fonte/frescor. Resumo, diário, grupos e Excel precisam representar a mesma população ou declarar diferenças de escopo de forma explícita e utilizável.
- Se duas fontes têm tempos de atualização diferentes, publicar snapshot/fonte/frescor por seção ou um snapshot consistente. `fresh=true`/refetch não será apresentado como refresh da MV.
- Não associar o saldo all-time ao lucro de um período como se fossem o mesmo total. Preservar saldo desconhecido e parte conhecida.
- A paginação de apresentação não deve alterar o total do período ou a população das outras seções.

## 4. Segurança, contrato e compatibilidade

- Autorização e isolamento por usuário/tenant em todas as projeções, cursores, referências e exportação. IDs alheios não podem revelar existência, nomes ou totais.
- Leituras e exportações continuam disponíveis em `READ_ONLY`, conforme as permissões comerciais publicadas. Sessão inválida é 401; não confundir com 402.
- Sem dinheiro float na representação em centavos. Preservar BIGINT e a precisão dos IDs de catálogo; explicitar codificação no OpenAPI. O site só formata valores e calcula geometria dos gráficos.
- Cache financeiro privado/no-store, sem reutilização entre tenants; manter as proteções existentes de sessão e exportação.
- Erros/limites/422/429/503 e parâmetros inválidos devem ter contrato. Não expor dados privados em mensagens ou cursores.
- Atualizar o OpenAPI completo, seus snapshots, documentação e testes de compatibilidade. Não fornecer uma união manual dos schemas de #184/#187. A PR deve oferecer um único documento inteiro, ligado ao seu commit e SHA-256, para revisão do consumidor.
- Nenhuma contratação, provisionamento, operação paga ou ativação de produção faz parte deste pedido.

## 5. Evidências exigidas

Cobrir, com API/banco reais e valores esperados verificados no backend:

- Um grupo com vários tipsters; um tipster em dois grupos; nomes repetidos; vínculos históricos; parcela sem atribuição; identidade de outra pessoa recusada.
- Lucro e prejuízo no mesmo grupo, zero e quantidade; totais e subtotais sem dupla contagem.
- Dias com lucro, prejuízo, zero confirmado, sem atividade, pendências e desconhecido. Não mascarar desconhecido como zero.
- Períodos curtos e longos, mudança de ano/fuso e navegação até todos os dias sem lacunas, duplicatas ou troca de granularidade. Cursor inválido, janela excessiva e histórico vazio.
- Filtros combinados suportados, apagadas/restauradas, freebet, conta/titular/banca, origem e grupos. Os mesmos filtros devem reconciliar diário, grupos, resumo e exportação conforme a política documentada.
- READ_ONLY e isolamento entre tenants, cache e erros, preservando contratos antigos.
- Desempenho e número de consultas em um período longo, sem N+1. Medir o que de fato for exercitado; não substituir dados de banco por mock na prova financeira.

Executar os gates existentes sem remover testes, baixar cobertura, ignorar checks ou usar sucesso de um HEAD anterior. Publicar as evidências e eventuais limitações reais.

## 6. Entrega e instruções ao frontend

Na PR, incluir:

1. `Closes #N` da issue emergencial e referência à frontend #20/#50; ADRs aplicáveis.
2. Base `main`, dependências necessárias declaradas, separação do escopo próprio e do código herdado. Não abrir PR empilhada e não fazer merge para contornar dependências.
3. Endpoints e exemplos completos do grupo/filhos, diário/intervalo, total/frescor e erros, sem pressupor campos que não existam no contrato final.
4. Commit exato e SHA-256 do documento OpenAPI inteiro; instrução de geração dos tipos e instrução de reconciliação após o merge administrativo.
5. Como o frontend envia os mesmos filtros para resumo/grupos/diário/exportação, lê null e usa o critério/fuso; tamanho de intervalo/cursor e limites.
6. Instruções reproduzíveis para a prova do site com sessão/API/banco reais em desktop e celular, sem promover fixture como build público.
7. PR fora de rascunho, todos os checks aplicáveis verdes no SHA final e confirmação do SHA validado. Se houver impedimento externo, declarar o estado real; não anunciar pronto.

O frontend pode preparar e revisar a aparência em demonstração isolada, mas **não fecha a #20 enquanto grupo→tipsters e diário de todo período não estiverem implementados com esse contrato**. O merge permanece com o administrador.
