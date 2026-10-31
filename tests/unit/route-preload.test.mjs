// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { routePreloads } from '../../scripts/route-preload';

const chunk = (name, module, imports = [], dynamicImports = [], css = []) => ({
  type: 'chunk',
  fileName: `assets/${name}.js`,
  facadeModuleId: module ? '/repo/' + module : null,
  imports,
  dynamicImports,
  viteMetadata: { importedCss: new Set(css) },
});
const bundle = {
  'assets/contas.js': chunk('contas', 'src/features/contas/ContasPage.tsx', [
    'assets/shared.js',
  ]),
  'assets/trocar.js': chunk(
    'trocar',
    'src/features/contas/troca/TrocaContaPage.tsx',
  ),
  'assets/shared.js': chunk(
    'shared',
    null,
    ['assets/contas.js'],
    ['assets/other.js'],
    ['assets/shared.css'],
  ),
  'assets/other.js': chunk('other', 'src/features/conta/AccountPage.tsx'),
};

it('inclui dependências estáticas e CSS uma vez; não antecipa imports de outras rotas', () => {
  const hints = routePreloads(bundle);
  expect(hints.find((r) => r.path === '/contas').files).toEqual([
    'assets/contas.js',
    'assets/shared.js',
    'assets/shared.css',
  ]);
  expect(routePreloads({})).toEqual([]);
});
it('ordena caminho fixo antes de parâmetro, independentemente da ordem do catálogo', () => {
  const hints = routePreloads(bundle);
  expect(hints.find((r) => r.path === '/contas/trocar').files).toEqual([
    'assets/trocar.js',
  ]);
  expect(hints.findIndex((r) => r.path === '/contas/trocar')).toBeLessThan(
    hints.findIndex((r) => r.path === '/contas/:titularId'),
  );
});
it.each(['https://externo.test/script.js', 'assets/../../script.js'])(
  'recusa arquivo fora dos assets públicos: %s',
  (fileName) => {
    expect(() =>
      routePreloads({
        ...bundle,
        'assets/contas.js': { ...bundle['assets/contas.js'], fileName },
      }),
    ).toThrow('Arquivo de rota');
  },
);
it('recusa CSS fora do build público', () => {
  expect(() =>
    routePreloads({
      ...bundle,
      'assets/contas.js': {
        ...bundle['assets/contas.js'],
        viteMetadata: { importedCss: new Set(['https://externo.test/a.css']) },
      },
    }),
  ).toThrow('Estilo de rota');
});

const source = readFileSync(
  new URL('../../src/styles/tema-inicial.js', import.meta.url),
  'utf8',
);
function boot(pathname, hints, readyState = 'complete', network = {}) {
  const links = [];
  const listeners = new Map();
  const linkListeners = new Map();
  const document = {
    readyState,
    documentElement: { dataset: {} },
    getElementById: () => ({ getAttribute: () => hints }),
    createElement: () => {
      const link = {};
      Object.defineProperties(link, {
        addEventListener: {
          value: (event, callback) =>
            linkListeners.set(link.href + ':' + event, callback),
        },
        getAttribute: { value: (key) => link[key] },
        removeAttribute: {
          value: (key) => {
            delete link[key];
          },
        },
      });
      return link;
    },
    querySelector: (selector) =>
      links.find(
        (link) =>
          link.rel === 'stylesheet' && selector.includes('"' + link.href + '"'),
      ),
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event) => listeners.delete(event),
    head: {
      append: (link) => {
        const old = links.indexOf(link);
        if (old >= 0) links.splice(old, 1);
        links.push(link);
      },
    },
  };
  const window = {
    location: { pathname },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    localStorage: {
      getItem() {
        throw new Error('Bloqueado');
      },
    },
  };
  runInNewContext(source, { document, window, ...network });
  const result = { links, theme: document.documentElement.dataset.tema };
  Object.defineProperties(result, {
    takeConfig: { value: () => window.bancaemdiaConfigInicial?.() },
    load: {
      value: (file, event = 'load') =>
        linkListeners.get(file + ':' + event)?.(),
    },
    parsed: {
      value: () => {
        document.readyState = 'interactive';
        listeners.get('readystatechange')?.();
      },
    },
  });
  return result;
}
it('inicia somente os arquivos da rota atual mesmo com storage bloqueado', () => {
  const hints = JSON.stringify([
    {
      path: '/contas/trocar',
      files: ['assets/troca.js', 'assets/troca.css', '//externo.test/a.js'],
    },
    { path: '/contas/:titularId', files: ['assets/contas.js'] },
  ]);
  expect(boot('/contas/trocar/', hints)).toEqual({
    theme: 'claro',
    links: [
      {
        href: '/assets/troca.js',
        crossOrigin: '',
        referrerPolicy: 'no-referrer',
        rel: 'modulepreload',
      },
      {
        href: '/assets/troca.css',
        crossOrigin: '',
        referrerPolicy: 'no-referrer',
        rel: 'preload',
        as: 'style',
      },
    ],
  });
  expect(boot('/contas/7', hints).links.map((l) => l.href)).toEqual([
    '/assets/contas.js',
  ]);
  expect(boot('/desconhecida', hints).links).toEqual([]);
});
it('antecipa só a configuração pública, sem cookie/referrer, e entrega o corpo completo uma vez', async () => {
  const options = [],
    timers = new Set();
  const app = boot('/login', '[]', 'complete', {
    AbortController,
    fetch: async (url, init) => {
      expect(url).toBe('/config.json');
      options.push(init);
      return Response.json({ VITE_API_URL: 'https://site.example.org' });
    },
    setTimeout: (_callback, delay) => {
      expect(delay).toBe(5000);
      const timer = {};
      timers.add(timer);
      return timer;
    },
    clearTimeout: (timer) => timers.delete(timer),
  });
  const pending = app.takeConfig();
  expect(app.takeConfig()).toBeUndefined();
  expect(await (await pending).json()).toEqual({
    VITE_API_URL: 'https://site.example.org',
  });
  expect(options).toHaveLength(1);
  expect(options[0]).toMatchObject({
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  expect(timers.size).toBe(0);
});
it('ausência ou corrupção do catálogo nunca impede tema e carga normal', () => {
  for (const hints of [null, '{inválido', '{}'])
    expect(boot('/', hints)).toEqual({ theme: 'claro', links: [] });
});
it('aplica somente CSS já recebido e após os estilos de entrada, em ordem estável', async () => {
  const app = boot(
    '/contas',
    JSON.stringify([
      { path: '/contas', files: ['assets/a.css', 'assets/b.css'] },
    ]),
    'loading',
  );
  app.load('/assets/b.css');
  await Promise.resolve();
  expect(app.links.every((l) => l.rel === 'preload')).toBe(true);
  app.load('/assets/a.css');
  await Promise.resolve();
  await Promise.resolve();
  expect(app.links.every((l) => l.rel === 'preload')).toBe(true);
  app.links.push({ href: '/assets/entry.css', rel: 'stylesheet' });
  app.parsed();
  expect(app.links.map((l) => [l.href, l.rel, l.as])).toEqual([
    ['/assets/entry.css', 'stylesheet', undefined],
    ['/assets/a.css', 'stylesheet', undefined],
    ['/assets/b.css', 'stylesheet', undefined],
  ]);
});
it('CSS recusado ou já solicitado pelo carregador normal não ganha aplicação duplicada', async () => {
  const app = boot(
    '/contas',
    JSON.stringify([
      { path: '/contas', files: ['assets/a.css', 'assets/b.css'] },
    ]),
    'complete',
  );
  app.links.push({ href: '/assets/a.css', rel: 'stylesheet' });
  app.load('/assets/a.css');
  app.load('/assets/b.css', 'error');
  await Promise.resolve();
  await Promise.resolve();
  expect(app.links.filter((l) => l.rel === 'stylesheet')).toHaveLength(1);
});
