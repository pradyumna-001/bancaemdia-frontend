import type { IndexHtmlTransformContext } from 'vite';
import routes from '../config/performance-routes.json';

type OutputBundle = NonNullable<IndexHtmlTransformContext['bundle']>;
type Chunk = Extract<OutputBundle[string], { type: 'chunk' }> & {
  viteMetadata?: { importedCss: Set<string> };
};
/** Build-owned asset names only. No request, identity or query string is input. */
export function routePreloads(bundle: OutputBundle) {
  return routes
    .slice()
    .sort((a, b) => {
      const dynamic = (path: string) =>
        path.split('/').filter((s) => s.startsWith(':')).length;
      return dynamic(a.path) - dynamic(b.path) || b.path.length - a.path.length;
    })
    .flatMap((route) => {
      const chunk = Object.values(bundle).find(
        (item): item is Chunk =>
          item.type === 'chunk' &&
          !!item.facadeModuleId
            ?.replaceAll('\\', '/')
            .endsWith('/' + route.module),
      );
      // Account is already in the initial entry. Development has no bundle.
      if (!chunk) return [];
      const files = new Set<string>();
      const seen = new Set<string>();
      const visit = (item: Chunk) => {
        if (seen.has(item.fileName)) return;
        seen.add(item.fileName);
        if (!/^assets\/[\w.-]+\.js$/.test(item.fileName))
          throw new Error('Arquivo de rota inválido.');
        files.add(item.fileName);
        for (const css of item.viteMetadata?.importedCss ?? []) {
          if (!/^assets\/[\w.-]+\.css$/.test(css))
            throw new Error('Estilo de rota inválido.');
          files.add(css);
        }
        // Static dependencies only. Other routes remain lazy.
        for (const name of item.imports) {
          const dependency = bundle[name];
          if (dependency?.type === 'chunk') visit(dependency);
        }
      };
      visit(chunk);
      return [{ path: route.path, files: [...files] }];
    });
}
