import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import type { Plugin } from 'vite';

export function criarFavicon(svg: string, css: string): string {
  const tokens = new Map<string, string>();
  postcss.parse(css).walkRules(':root', (rule) => {
    rule.walkDecls((declaration) => {
      tokens.set(declaration.prop, declaration.value);
    });
  });
  return svg.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    const value = tokens.get(name);
    if (!value || !/^#[a-f\d]{6}$/i.test(value)) {
      throw new Error('Token de cor do favicon ausente ou inválido: ' + name);
    }
    return value;
  });
}

export function faviconMarca(): Plugin {
  const gerar = () =>
    criarFavicon(
      readFileSync(
        new URL('../src/marca/favicon.svg', import.meta.url),
        'utf8',
      ),
      readFileSync(
        new URL('../src/styles/tokens.css', import.meta.url),
        'utf8',
      ),
    );
  return {
    name: 'favicon-da-paleta',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/favicon.svg') return next();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(gerar());
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'favicon.svg',
        source: gerar(),
      });
    },
  };
}
