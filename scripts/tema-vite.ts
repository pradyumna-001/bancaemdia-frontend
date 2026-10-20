import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export function temaInicial(): Plugin {
  return {
    name: 'tema-antes-da-pintura',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
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
        return html.replace(
          charset,
          (tag) => tag + '\n<script id="tema-inicial">' + script + '</script>',
        );
      },
    },
  };
}
