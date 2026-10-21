import { createHash } from 'node:crypto';

/** The subset of Rollup's ModuleInfo this grouping reads. */
export type ModuleInfoLike = {
  isEntry: boolean;
  importers: readonly string[];
  importedIds: readonly string[];
  dynamicImporters: readonly string[];
  code?: string | null;
};
export type GetModuleInfo = (id: string) => ModuleInfoLike | null;

/** Pages whose own code (outside the entry) stays below this size are light. */
export const LIGHT_PAGE_BYTES = 30_000;
/** A module joins the shared private chunk when this many heavy pages use it. */
export const SHARED_MIN_PAGES = 3;
/** Shared source modules smaller than this ride in the entry: no extra request. */
export const TINY_SHARED_BYTES = 2_000;

const normalize = (id: string) => id.replaceAll('\\', '/');

/**
 * Route chunk grouping for the public build. Heavy pages otherwise download
 * 10-20 tiny shared chunks, and every queued request costs a round trip on a
 * mobile connection. Modules used by at least three heavy pages form one shared
 * chunk; light pages never depend on it. Tiny shared modules join the entry.
 * Other shared modules keep Rollup's default grouping by the exact set of
 * pages, named explicitly so the shared chunk cannot absorb them. Page modules
 * and the entry graph are untouched.
 */
export function createRouteChunks() {
  const reachable = new Map<string, boolean>();
  const light = new Map<string, boolean>();
  const fromEntry = (
    get: GetModuleInfo,
    id: string,
    seen: Set<string>,
  ): boolean => {
    if (normalize(id).endsWith('/index.html')) return true;
    if (reachable.has(id)) return reachable.get(id)!;
    if (seen.has(id)) return false;
    seen.add(id);
    const info = get(id);
    const result: boolean =
      !!info &&
      (info.isEntry ||
        info.importers.some((importer) => fromEntry(get, importer, seen)));
    return result;
  };
  const inEntry = (get: GetModuleInfo, id: string) => {
    if (!reachable.has(id)) reachable.set(id, fromEntry(get, id, new Set()));
    return reachable.get(id)!;
  };
  const pagesOf = (get: GetModuleInfo, id: string) => {
    const pages = new Set<string>();
    const seen = new Set<string>();
    const walk = (current: string) => {
      if (seen.has(current)) return;
      seen.add(current);
      const info = get(current);
      if (!info) return;
      if (info.dynamicImporters.length) pages.add(current);
      info.importers.forEach(walk);
    };
    walk(id);
    return pages;
  };
  const isLight = (get: GetModuleInfo, page: string) => {
    if (light.has(page)) return light.get(page)!;
    let size = 0;
    const seen = new Set<string>();
    const walk = (current: string) => {
      if (seen.has(current)) return;
      seen.add(current);
      const info = get(current);
      if (!info) return;
      if (
        current !== page &&
        (inEntry(get, current) || info.dynamicImporters.length)
      )
        return;
      size += info.code?.length ?? 0;
      info.importedIds.forEach(walk);
    };
    walk(page);
    const result = size < LIGHT_PAGE_BYTES;
    light.set(page, result);
    return result;
  };
  return (id: string, { getModuleInfo }: { getModuleInfo: GetModuleInfo }) => {
    const info = getModuleInfo(id);
    if (!info || info.dynamicImporters.length) return undefined;
    // Entry modules stay in the entry chunk instead of being pulled elsewhere.
    if (inEntry(getModuleInfo, id)) return 'index';
    const pages = pagesOf(getModuleInfo, id);
    const heavy = [...pages].every((page) => !isLight(getModuleInfo, page));
    if (pages.size >= SHARED_MIN_PAGES && heavy) return 'rotas-comum';
    if (pages.size < 2 || !normalize(id).includes('/src/')) return undefined;
    // A few hundred bytes are cheaper in the entry than one queued request.
    // Only leaves join it, so the entry never gains a new static dependency.
    if (
      (info.code?.length ?? Infinity) < TINY_SHARED_BYTES &&
      info.importedIds.every((dependency) => inEntry(getModuleInfo, dependency))
    )
      return 'index';
    const names = [...pages]
      .map((page) =>
        normalize(page)
          .split('/')
          .at(-1)!
          .replace(/\.tsx?$/, ''),
      )
      .sort();
    return (
      'compartilhado-' +
      createHash('sha256').update(names.join('|')).digest('hex').slice(0, 8)
    );
  };
}
