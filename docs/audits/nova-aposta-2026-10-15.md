# Nova aposta manual (#29): criação após resposta perdida

## Estado

Auditoria de 15/10/2026. Implementação da #29 bloqueada por contrato de criação reconciliável ausente. Nenhuma tela funcional, tipo futuro, endpoint ou política de replay foi inventado. As tasks de implementação continuam desmarcadas. Merges pertencem ao administrador.

## Evidência verificada

- Main backend conferida por fetch: `b916f54331f14cf47a3800324bd61d8638043c06`. [criar_aposta](https://github.com/pradyumna-001/bancaemdia-api/blob/b916f54331f14cf47a3800324bd61d8638043c06/src/bancaemdia/api/v1/apostas.py#L620) recebe ApostaManual, cria `m:uuid4().hex` dentro do pedido (linha 647), aplica eventos e confirma a transação antes da resposta 201. Não recebe identidade durável escolhida pelo cliente nem Idempotency-Key.
- O mesmo comportamento existe na árvore real do consumidor `547a4d0cfce5308dfe71221a77ad6fd5eb6e47cd`, pin atual da frontend #94. O OpenAPI inteiro de 125 operações não contém consulta de criação manual por identidade conhecida antes do POST. Não há middleware global que forneça esse protocolo.
- ApostaManual proíbe campos extras; não aceita chave/UUID de intenção. BetCreatedResponse entrega aposta, casa_id e aviso somente na resposta. Buscar por chave exige conhecer a chave criada no servidor.
- A backend #36 está fechada. Seus testes de duplicação manual usam `ApostaRepo.upsert_materializada` com chave fixa no payload. Essa garantia de repositório não protege dois POSTs da SPA, que recebem chaves distintas.
- Atribuição da #136 está integrada: conta explícita pertence ao usuário/casa; sem referência, o backend resolve pela data do jogo e abre revisão quando ausente/ambígua. A matriz existente mostra contas/histórico; a SPA não deve reproduzir o resolvedor temporal nem escolher a primeira conta. Uma nova prévia de atribuição não é necessária para reparar a recuperação.
- PRs backend abertas #184/#185/#187/#189/#191/#193/#195/#197/#199/#201 foram conferidas; nenhuma entrega identidade/recibo da criação manual. A capacidade não está coberta pelas emergências anteriores.

## Consequência

Se o servidor gravar e a resposta se perder, a SPA não tem identidade para consultar aquela criação. Reenviar o formulário gera outra chave. Filtrar apostas por data/casa/texto, comparar totais, deduplicar conteúdo no cliente ou guardar um UUID que o servidor ignora não prova o resultado. Duas apostas legitimamente iguais também precisam continuar possíveis.

## Entrega mínima no backend

Publicar criação manual com identidade escolhida antes do POST, recibo durável atômico com aposta/eventos/revisão e GET seguro por essa mesma identidade. Vincular identidade ao usuário e ao conteúdo normalizado; mesmo UUID/corpo devolve a mesma criação, outro corpo conflita, concorrência não duplica e UUIDs diferentes permitem apostas iguais. Documentar retenção, expiração, ausência, resultado desconhecido, reenvio explícito e permissões READ_ONLY/FULL_WRITE. 404/410 não demonstram rollback. Manter compatibilidade com consumidores anteriores.

Reutilizar a criação e a atribuição existentes. Freebet conserva stake_unidades como face; custo próprio zero e demais valores são decididos pelo servidor. Data_aposta padrão, unidade vigente e conta são fixadas na primeira criação e não recalculadas no replay. Recusa 422 identifica campo por enum/rótulo público seguro; não expor input/msg/ctx, corpo bruto ou diagnóstico interno. Identificadores BIGINT e eventual dinheiro novo usam representação exata no contrato.

Exigir testes HTTP/PostgreSQL reais para resposta perdida após commit, repetição/concorrência, conflito de corpo, duas intenções iguais distintas, reinício, retenção, isolamento/RLS, conta ausente/ambígua/explícita/multicontas, freebet, erro atômico, 401/402/CSRF e compatibilidade. Publicar OpenAPI inteiro e política de recuperação gerados pela mesma árvore real, preservando os contratos anteriores. Reconciliação sobre o pin completo do consumidor, nunca união manual de schemas.

## Continuação do frontend

Branch `feat/29-nova-aposta` inicia após `1428e9a5923dd622a3c54bdeada5f145ff5aa2c6` (frontend #94). PR futura contra main, declarando #94 e a emergência backend. Após a entrega: verificar SHA/hash, reconciliar um único sandbox completo, gerar tipos/políticas, implementar formulário sem cálculos financeiros e provar mobile/desktop nos três browsers. Até lá não há PR de implementação pronta nem autorização de publicação.
