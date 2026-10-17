// Capabilities and validators come from one verified document, never from a merge of schemas.
export function siteReadContract(document) {
  const selected = [
    '/api/v1/caixa',
    '/api/v1/caixa/saldo',
    '/api/v1/caixa/extrato',
    '/api/v1/apostas',
    '/api/v1/apostas/{chave}',
    '/api/v1/revisao/{revisao_id}',
    '/api/v1/titulares',
    '/api/v1/titulares/{titular_id}/matriz',
    '/api/v1/titulares/casas/{casa_id}/matriz',
    '/api/v1/titulares/financeiro',
    '/api/v1/titulares/trocas/intencao',
    '/api/v1/painel/filtrado',
    '/api/v1/painel/filtrado/metricas',
    '/api/v1/painel/filtrado/export',
    '/api/v1/painel/filtrado/grupos',
    '/api/v1/painel/filtrado/diario',
    '/api/v1/painel/filtrado/detalhado/export',
    '/api/v1/painel',
    '/api/v1/painel/analises',
    '/api/v1/filtros/{dimensao}',
  ];
  function compact(node) {
    if (node.$ref) {
      const name = node.$ref.split('/').at(-1);
      if (name === 'JsonValue' && document.components.schemas[name]?.oneOf)
        return { json: true };
      return compact(document.components.schemas[name]);
    }
    const result = {};
    for (const key of [
      'type',
      'required',
      'enum',
      'const',
      'pattern',
      'minimum',
      'maximum',
      'minLength',
      'maxLength',
    ])
      if (node[key] !== undefined) result[key] = node[key];
    if (node.anyOf) result.anyOf = node.anyOf.map(compact);
    if (node.oneOf) result.oneOf = node.oneOf.map(compact);
    if (node.items) result.items = compact(node.items);
    if (
      node.additionalProperties &&
      typeof node.additionalProperties === 'object'
    )
      result.additionalProperties = compact(node.additionalProperties);
    if (node.properties)
      result.properties = Object.fromEntries(
        Object.entries(node.properties).map(([key, value]) => [
          key,
          compact(value),
        ]),
      );
    return result;
  }
  const operations = [
    ...Object.entries(document.paths).flatMap(([path, methods]) =>
      path.startsWith('/api/v1/planilhas/') ||
      path.startsWith('/api/v1/resultados/') ||
      path.startsWith('/api/v1/revisao-operacional/') ||
      path.startsWith('/api/v1/apostas-manuais/')
        ? Object.keys(methods)
            .filter((method) => ['get', 'post', 'put'].includes(method))
            .map((method) => [path, method])
        : [],
    ),
    ...selected.map((path) => [path, 'get']),
    ['/api/v1/apostas/{chave}', 'patch'],
    ['/api/v1/caixa', 'post'],
    ['/api/v1/caixa/contas/{conta_casa_id}/banca', 'patch'],
    ['/api/v1/apostas/{chave}', 'delete'],
    ['/api/v1/apostas/{chave}/restaurar', 'post'],
    ['/api/v1/apostas/{chave}/resultado', 'post'],
    ['/api/v1/revisao/{revisao_id}/resolver', 'post'],
    ['/api/v1/titulares', 'post'],
    ['/api/v1/titulares/trocas/preview', 'post'],
    ['/api/v1/titulares/trocas', 'post'],
    ['/api/v1/titulares/{titular_id}', 'patch'],
    ['/api/v1/titulares/{titular_id}', 'delete'],
    ['/api/v1/titulares/{titular_id}/contas', 'post'],
    ['/api/v1/titulares/{titular_id}/contas/{conta_id}', 'patch'],
    ['/api/v1/titulares/{titular_id}/contas/{conta_id}/ativar', 'post'],
  ];
  return Object.fromEntries(
    operations.flatMap(([path, method]) => {
      const operation = document.paths[path]?.[method];
      if (!operation) return [];
      const response = Object.entries(operation.responses).find(
        ([status, value]) =>
          /^2\d\d$/.test(status) && value.content?.['application/json'],
      )?.[1].content['application/json'].schema;
      return [
        [
          method === 'get' ? path : `${method.toUpperCase()} ${path}`,
          {
            query: Object.fromEntries(
              (operation.parameters ?? [])
                .filter((p) => p.in === 'query')
                .map((p) => [p.name, compact(p.schema)]),
            ),
            ...(response
              ? {
                  response: compact(response),
                }
              : {}),
          },
        ],
      ];
    }),
  );
}
