// @vitest-environment node
import { expect, it } from 'vitest';
import {
  LIGHT_PAGE_BYTES,
  createRouteChunks,
} from '../../scripts/route-chunks.ts';

const big = 'x'.repeat(LIGHT_PAGE_BYTES);
/** id -> { imports, dynamic, code, entry } */
function graph(spec) {
  const importers = new Map();
  const dynamicImporters = new Map();
  for (const [id, node] of Object.entries(spec)) {
    for (const child of node.imports ?? [])
      importers.set(child, [...(importers.get(child) ?? []), id]);
    for (const child of node.dynamic ?? [])
      dynamicImporters.set(child, [...(dynamicImporters.get(child) ?? []), id]);
  }
  return (id) =>
    spec[id]
      ? {
          isEntry: !!spec[id].entry,
          importers: importers.get(id) ?? [],
          importedIds: spec[id].imports ?? [],
          dynamicImporters: dynamicImporters.get(id) ?? [],
          code: spec[id].code ?? '',
        }
      : null;
}
const src = (name) => `/repo/src/${name}`;
const spec = {
  [src('main.tsx')]: {
    entry: true,
    imports: [src('app.ts')],
    dynamic: [src('A.tsx'), src('B.tsx'), src('C.tsx'), src('Leve.tsx')],
  },
  [src('app.ts')]: {},
  [src('A.tsx')]: {
    imports: [src('x.ts'), src('y.ts'), src('app.ts')],
    code: big,
  },
  [src('B.tsx')]: { imports: [src('x.ts'), src('z.ts')], code: big },
  [src('C.tsx')]: { imports: [src('x.ts'), src('z.ts')], code: big },
  [src('Leve.tsx')]: { imports: [src('y.ts')] },
  [src('x.ts')]: {},
  [src('y.ts')]: {},
  [src('z.ts')]: {},
  [src('so-a.ts')]: {},
};
spec[src('A.tsx')].imports.push(src('so-a.ts'));

it('módulos de três páginas pesadas formam um chunk compartilhado', () => {
  const chunks = createRouteChunks();
  const getModuleInfo = graph(spec);
  const name = (id) => chunks(id, { getModuleInfo });
  expect(name(src('x.ts'))).toBe('rotas-comum');
  // Light pages never depend on the shared chunk.
  expect(name(src('y.ts'))).toMatch(/^compartilhado-[a-f0-9]{8}$/);
  expect(name(src('z.ts'))).toMatch(/^compartilhado-[a-f0-9]{8}$/);
  expect(name(src('z.ts'))).not.toBe(name(src('y.ts')));
  // Pages, page-exclusive modules and the entry graph keep their places.
  expect(name(src('A.tsx'))).toBeUndefined();
  expect(name(src('so-a.ts'))).toBeUndefined();
  expect(name(src('app.ts'))).toBe('index');
  expect(name(src('main.tsx'))).toBe('index');
});
it('nome do grupo depende só do conjunto de páginas, não da ordem', () => {
  const first = createRouteChunks();
  const second = createRouteChunks();
  const getModuleInfo = graph(spec);
  expect(first(src('z.ts'), { getModuleInfo })).toBe(
    second(src('z.ts'), { getModuleInfo }),
  );
  expect(first('/repo/ausente.ts', { getModuleInfo })).toBeUndefined();
});
