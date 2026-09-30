# Cliente tipado — #9

Contrato adotado: API main integrada em `bd055417459f796fed960b5b37efb33a9744419f`. [Referência e hash](../../config/api-contract.json), [tipos](../../src/api/schema.d.ts), [políticas geradas](../../src/api/operations.generated.ts), [ADR003](../adrs/003-api-client-typing-session.md). O PR backend #168 de identidade continua separado; esta entrega não promove seu schema nem implementa sessão/telas.

## Versão e atualização

`pnpm gen-types` lê uma única referência completa com SHA-256 dos bytes. O hash atual é `cd35afa0d037f14f3c68d7502a4fff0402b4490f6d2a1552c2fa790a87447881`. Primeiro verifica bytes e OpenAPI3; depois gera/formata tipos e políticas de upload/idempotência do mesmo documento. A CI regenera e exige ausência de drift nos dois arquivos. Um snapshot local pode substituir o download somente com o mesmo hash; URL alternativa/main/latest é recusada.

Atualização exige verificar que o commit foi integrado no backend, comparar contratos e impactos nas consumidoras, atualizar commit/hash no manifesto e revisar a regeneração de ambos os arquivos. Não adicionar shapes manuais nem unir branches. Hash confirma conteúdo, não confirma integração/deploy; essa disponibilidade é auditada no PR de atualização.

## Uso do transporte

`getApiClient()` cria um único cliente após `initializeConfig()`. A #11 poderá chamar `initializeApiClient({ getCsrfToken: lerCsrfAtual })` uma vez, antes do primeiro uso; esse accessor consulta somente memória e acompanha rotação/troca de sessão. Reconfiguração silenciosa é recusada. `createApiClient` permite instância isolada em testes e integração controlada. Nenhum singleton nasce ao importar o módulo.

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

Na versão adotada, somente `POST /api/v1/caixa` publica `Idempotency-Key`, obrigatória. `createIdempotencyKey()` gera uma chave por intenção confirmada; a consumidora conserva **a mesma chave e o mesmo corpo** para reconciliação. Não gerar outra chave para tentar repetir o mesmo movimento. Corpo diferente com a mesma chave é conflito decidido pelo servidor. Chave ausente/vazia e chave em operação não contratada são recusadas; o transporte nunca reenvia mutação automaticamente.

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

Na planilha, usar campos `arquivo` e `origem_id` contratados. Não criar protocolo de prévia/consentimento/prints para contornar lacunas da #50. Aceite 202 conserva `job_id`/`status_url`; falhas parciais do status não são convertidas em sucesso total ou cancelamento remoto.

## Erros e evidência

ApiError expõe apenas `kind`, `status`, código conhecido, mensagem pt-BR, `retryAfterMs`, `requestId` seguro e `outcomeUnknown`. Corpo, trace, URL, senha/token e causa externa não são retidos. Código auth pode vir de `X-Auth-Error`; nunca exibir `detail` arbitrário. 401 e 402 têm mensagens distintas e não disparam logout aqui. Retry-After aceita segundos e HTTP-date, preservando zero. A #10 aplicará decisão limitada de retry/recuperação sem duplicar writes.

Fixtures/MSW em `tests/fixtures/api/` são tipadas pelos schemas selecionados: null, HTTP401/402/409/422/429/503, resposta não JSON, upload202/resultado parcial, bytes, cancelamento, prazo e chave estável. O caso 402 testa separação de erro; billing permanece em PR separado, sem afirmar disponibilidade desse recurso na main. Nenhum endpoint fictício é usado e nenhum mock entra no bundle. Tipos estáticos não são um validador runtime completo do JSON de sucesso; os testes de contrato backend continuam necessários.

Vitest verifica transporte e hash/drift. Cobertura por arquivo passa a incluir `src/api/`, com os mesmos quatro gates >=80%, além de lib/features. CI preserva E2E nos três browsers/dois viewports, budget, Lighthouse, pre-commit, Docker/CSP, GitGuardian e os nove+dois aceites reais de identidade herdados da #49. Não há alteração visual nem conexão de tela/guard à sessão nesta issue; integração dessas consumidoras fica na #11/#12.
