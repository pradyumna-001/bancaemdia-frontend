// @vitest-environment node
import { expect, it } from 'vitest';
import {
  LIGHT_PAGE_BYTES,
  TINY_SHARED_BYTES,
  createRouteChunks,
} from '../../scripts/route-chunks.ts';

const big = 'x'.repeat(LIGHT_PAGE_BYTES);
const medium = 'x'.repeat(TINY_SHARED_BYTES);
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
  [src('Leve.tsx')]: {
    imports: [src('y.ts'), src('folha.ts'), src('pequeno.ts')],
  },
  [src('x.ts')]: { code: medium },
  [src('y.ts')]: { code: medium },
  [src('z.ts')]: { code: medium, imports: [src('folha.ts')] },
  [src('folha.ts')]: { code: 'export const a = 1;' },
  [src('pequeno.ts')]: { code: 'export const b = 2;', imports: [src('z.ts')] },
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
  // Tiny shared leaves ride in the entry; a tiny module with its own
  // dependency would add a static entry import, so it keeps its group.
  expect(name(src('folha.ts'))).toBe('index');
  expect(name(src('pequeno.ts'))).toBeUndefined();
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
it('grupo contido em outro se une a ele; módulo só de pesadas entra no comum', () => {
  const familia = {
    [src('main.tsx')]: {
      entry: true,
      dynamic: [src('P.tsx'), src('Q.tsx'), src('R.tsx'), src('L.tsx')],
    },
    [src('P.tsx')]: {
      imports: [src('c.ts'), src('g1.ts'), src('g2.ts'), src('proto.ts')],
      code: big,
    },
    [src('Q.tsx')]: { imports: [src('c.ts'), src('g2.ts')], code: big },
    [src('R.tsx')]: { imports: [src('c.ts'), src('proto.ts')], code: big },
    [src('L.tsx')]: { imports: [src('g1.ts'), src('g2.ts')] },
    // c.ts: three heavy pages. g2: {L, P, Q}; g1: {L, P} ⊂ g2's pages.
    [src('c.ts')]: { code: medium },
    [src('g2.ts')]: { code: medium },
    [src('g1.ts')]: { code: medium, imports: [src('g2.ts')] },
    // Only heavy pages, and its dependency is already in the shared chunk.
    [src('proto.ts')]: { code: medium, imports: [src('c.ts')] },
  };
  const chunks = createRouteChunks();
  const getModuleInfo = graph(familia);
  const getModuleIds = () => Object.keys(familia);
  const name = (id) => chunks(id, { getModuleInfo, getModuleIds });
  expect(name(src('c.ts'))).toBe('rotas-comum');
  expect(name(src('proto.ts'))).toBe('rotas-comum');
  expect(name(src('g1.ts'))).toBe(name(src('g2.ts')));
  expect(name(src('g2.ts'))).toMatch(/^compartilhado-[a-f0-9]{8}$/);
  // The light page keeps its family group and never gains the shared chunk.
  expect(name(src('g1.ts'))).not.toBe('rotas-comum');
});
