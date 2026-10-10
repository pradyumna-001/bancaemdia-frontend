# Cliente tipado — #9

Contrato atual, atualizado pela #52: API main integrada em `b916f54331f14cf47a3800324bd61d8638043c06`, incluindo identidade e acesso comercial. [Referência e hash](../../config/api-contract.json), [tipos](../../src/api/schema.d.ts), [políticas geradas](../../src/api/operations.generated.ts), [ADR003](../adrs/003-api-client-typing-session.md). A disponibilidade no ambiente de publicação ainda exige homologação; integração do código não afirma deploy.

## Versão e atualização

`pnpm gen-types` lê uma única referência completa com SHA-256 dos bytes. O hash atual é `0714381b9e0e4797000932636ffb770b794dc7b6731c1bfcea3d46881bfbe11a`. Primeiro verifica bytes e OpenAPI3; depois gera/formata tipos e políticas de upload/idempotência do mesmo documento. A CI regenera e exige ausência de drift nos dois arquivos. Um snapshot local pode substituir o download somente com o mesmo hash; URL alternativa/main/latest é recusada. `pnpm check:contract-integration` verifica a integração do commit fixado antes da publicação.

Atualização exige verificar que o commit foi integrado no backend, comparar contratos e impactos nas consumidoras, atualizar commit/hash no manifesto e revisar a regeneração de ambos os arquivos. Não adicionar shapes manuais nem unir branches. Hash confirma conteúdo, não confirma integração/deploy; essa disponibilidade é auditada no PR de atualização.

## Uso do transporte

`getApiClient()` cria um único cliente após `initializeConfig()`. O bootstrap chama `initializeApiClient` uma vez, antes do primeiro uso, com a prova CSRF e o contexto privado do serviço de sessão em memória. A #52 acrescenta `beforeMutation` para conferir acesso comercial antes de escrita e `onAccessDenied` para invalidar a confirmação após 402, sem repetir a operação. Ver [acesso](acesso.md). Reconfiguração silenciosa é recusada. `createApiClient` permite instância isolada em testes e integração controlada. Nenhum singleton nasce ao importar o módulo.

```ts
const client = getApiClient();
const { data } = await client.GET('/api/v1/apostas', {
  params: { query: { page: 1, page_size: 50, estado: 'PENDENTE' } },
  signal: controller.signal,
});
```

Métodos, paths, parâmetros, corpo e resposta são inferidos do OpenAPI por openapi-fetch. `null` e agregados financeiros permanecem como vieram; o transporte não calcula saldo/lucro/ROI nem valida semanticamente a população de um resumo. JSON de sucesso recusa números não finitos ou inteiros fora da faixa exata de JavaScript, inclusive centavos/IDs: apresenta erro de resposta em vez de arredondar silenciosamente. Se uma versão precisar transportar BIGINT além dessa faixa, o contrato integrado deve definir representação exata; não fazer conversão financeira local para cobrir a lacuna. Downloads opacos preservam os bytes. As consumidoras continuam responsáveis pelos contratos específicos da #50.

Request força `credentials: include`, `cache: no-store`, `redirect: error`. Authorization é recusado; leituras retiram CSRF e mutações consultam a prova atual em memória. Cookies e validação de Origin/CSRF são operados pelo navegador/servidor. Sem prova, o servidor decide a autorização: este cliente não simula sessão nem concede acesso. Overrides de origem/fetch por chamada são recusados. Não há SDK de emissor, refresh ou navegação automática nesta entrega.

Timeout: leitura 10s, escrita 15s, operações multipart 60s, incluindo recepção do corpo. AbortSignal do chamador se combina com o deadline; timers/listeners são removidos ao concluir. Interromper a espera não cancela job/processamento remoto. Mutação enviada com timeout/cancelamento/falha de rede/resposta inválida ou HTTP5xx tem `outcomeUnknown=true`: conferir resultado antes de repetir. Aborto anterior ao envio não afirma resultado desconhecido. O transporte não tenta novamente leitura ou escrita; recuperação/backoff da UI pertence à #10 e writes não entram em retries de queries.

## Idempotência e formatos

Na versão adotada, `POST /api/v1/caixa`, `POST /api/v1/billing/subscribe`, `POST /api/v1/titulares/trocas` e `POST /api/v1/titulares/trocas/preview` publicam `Idempotency-Key`, conforme as políticas geradas. `createIdempotencyKey()` gera uma chave por intenção confirmada; a consumidora conserva **a mesma chave e o mesmo corpo** para reconciliação. Não gerar outra chave para tentar repetir a mesma intenção. Corpo diferente com a mesma chave é conflito decidido pelo servidor. Chave ausente/vazia e chave em operação não contratada são recusadas; o transporte nunca reenvia mutação automaticamente.

Downloads finitos usam `parseAs: 'blob'` ou `'arrayBuffer'`; `/metrics` pode usar `'text'`. JSON inesperado/malformado em uma leitura JSON vira ApiError seguro. Modo stream fica fora do contrato deste cliente; arquivos são recebidos integralmente sob o deadline. Cabeçalhos de download e bytes são preservados.

Uploads usam `bodySerializer` com FormData real. A string binary do gerador identifica o campo; o arquivo real entra no serializer, sem casts de resposta ou Content-Type JSON/manual boundary:

```ts
const result = await client.POST('/api/v1/upload', {
  body: { file: file.name },
  bodySerializer: () => {
    const form = new FormData();
    form.append('file', file);
    return form;
  },
  signal: controller.signal,
});
```

Na planilha, usar campos `arquivo` e `origem_id` contratados. Não criar protocolo de prévia/prints para contornar lacunas da #50. Aceite 202 conserva `job_id`/`status_url`; falhas parciais do status não são convertidas em sucesso total ou cancelamento remoto. O upload inicia processamento e o site acompanha o resultado, sem estimativa/aviso de custo de processamento ou aprovação de gasto (ADR019, decisão de 06/10/2026). Eventual campo de estimativa retornado pela API não cria etapa visual; limites máximos de gasto por usuário permanecem no backend.

## Erros e evidência

ApiError expõe `kind`, `status`, código conhecido, mensagem pt-BR, `retryAfterMs`, `requestId` seguro, `outcomeUnknown` e a projeção de campos 422 `invalidFields`. Corpo, input/msg/ctx de validação, trace, URL, senha/token e causa externa não são retidos. Código auth pode vir de `X-Auth-Error`; nunca exibir `detail` arbitrário. 401 e 402 têm mensagens distintas e não disparam logout aqui. Retry-After aceita segundos e HTTP-date, preservando zero. A [#10](recuperacao.md) aplica decisão limitada de retry/recuperação sem duplicar writes; limites de paginação também são gerados do mesmo snapshot.

Fixtures/MSW em `tests/fixtures/api/` são tipadas pelos schemas selecionados: null, HTTP401/402/409/422/429/503, resposta não JSON, upload202/resultado parcial, bytes, cancelamento, prazo e chave estável. O caso 402 testa separação de erro; a #52 usa o billing integrado e comprova a distinção entre sessão e acesso comercial. Nenhum endpoint fictício é usado e nenhum mock entra no bundle. Tipos estáticos não são um validador runtime completo do JSON de sucesso; os testes de contrato backend continuam necessários.

Vitest verifica transporte e hash/drift. Cobertura por arquivo inclui `src/api/`, com os mesmos quatro gates >=80%, além de lib/features/auth. CI preserva E2E nos três browsers/dois viewports, budget, Lighthouse, pre-commit, Docker/CSP, GitGuardian e a prova real de identidade/acesso. A #9 entregou originalmente o transporte; #11/#12 conectaram sessão e conta, e #52 acrescenta o aviso e a proteção por operação.
