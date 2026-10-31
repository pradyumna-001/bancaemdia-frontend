import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { routePreloads } from './route-preload';

export function temaInicial(): Plugin {
  return {
    name: 'tema-antes-da-pintura',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const script = readFileSync(
          fileURLToPath(
            new URL('../src/styles/tema-inicial.js', import.meta.url),
          ),
          'utf8',
        ).replaceAll('\r\n', '\n');
        // Charset stays within the first 1024 bytes. The theme still precedes
        // styles, without changing its exact CSP-authorized source.
        const charset = /<meta\s+charset=["']UTF-8["']\s*\/?>/i;
        const match = charset.exec(html);
        if (
          !match ||
          Buffer.byteLength(
            html.slice(0, match.index + match[0].length),
            'utf8',
          ) > 1024
        )
          throw new Error('Declaração UTF-8 ausente ou tardia no HTML.');
        const hints = context?.bundle ? routePreloads(context.bundle) : [];
        const metadata = hints.length
          ? '\n<meta id="rotas-iniciais" content="' +
            JSON.stringify(hints)
              .replaceAll('&', '&amp;')
              .replaceAll('"', '&quot;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;') +
            '">'
          : '';
        return html.replace(
          charset,
          (tag) =>
            tag +
            metadata +
            '\n<script id="tema-inicial">' +
            script +
            '</script>',
        );
      },
    },
  };
}
