// Capabilities and validators come from one verified document, never from a merge of schemas.
export function siteReadContract(document) {
  const selected = [
    '/api/v1/apostas',
    '/api/v1/apostas/{chave}',
    '/api/v1/revisao/{revisao_id}',
    '/api/v1/titulares',
    '/api/v1/titulares/{titular_id}/matriz',
    '/api/v1/painel/filtrado',
    '/api/v1/painel/filtrado/metricas',
    '/api/v1/painel/filtrado/export',
    '/api/v1/filtros/{dimensao}',
  ];
  function compact(node) {
    if (node.$ref) {
      const name = node.$ref.split('/').at(-1);
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
    if (node.items) result.items = compact(node.items);
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
    ...selected.map((path) => [path, 'get']),
    ['/api/v1/apostas/{chave}', 'patch'],
    ['/api/v1/apostas/{chave}', 'delete'],
    ['/api/v1/apostas/{chave}/restaurar', 'post'],
    ['/api/v1/apostas/{chave}/resultado', 'post'],
    ['/api/v1/revisao/{revisao_id}/resolver', 'post'],
  ];
  return Object.fromEntries(
    operations.flatMap(([path, method]) => {
      const operation = document.paths[path]?.[method];
      if (!operation) return [];
      return [
        [
          method === 'get' ? path : `${method.toUpperCase()} ${path}`,
          {
            query: Object.fromEntries(
              (operation.parameters ?? [])
                .filter((p) => p.in === 'query')
                .map((p) => [p.name, compact(p.schema)]),
            ),
            ...(operation.responses['200'].content?.['application/json']
              ? {
                  response: compact(
                    operation.responses['200'].content['application/json']
                      .schema,
                  ),
                }
              : {}),
          },
        ],
      ];
    }),
  );
}
