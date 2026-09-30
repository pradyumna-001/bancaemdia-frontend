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
        // Inserir antes dos estilos: React e config podem demorar ou falhar.
        return html.replace(
          '<head>',
          '<head>\n<script id="tema-inicial">' + script + '</script>',
        );
      },
    },
  };
}
