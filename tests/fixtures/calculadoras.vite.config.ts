import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
import golden from './calculadoras-golden.json';
export default defineConfig({
  root: fileURLToPath(new URL('./calculadoras/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'calculadoras-simuladas-somente-no-build-de-testes',
      configurePreviewServer(server) {
        server.middlewares.use('/api/v1/billing/status', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ...billingStatus, access: 'READ_ONLY' }));
        });
        server.middlewares.use('/api/v1/calculadoras', (req, res) => {
          let bytes = '';
          req.on('data', (part) => {
            bytes += String(part);
          });
          req.on('end', () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const body = JSON.parse(bytes);
              const entry = golden.cases.find(
                (item) =>
                  `/${item.tool}` === req.url &&
                  JSON.stringify(item.body) === JSON.stringify(body),
              );
              if (entry) res.end(JSON.stringify(entry.response));
              else {
                res.statusCode = 422;
                res.end(JSON.stringify({ detail: 'fixture_sample_only' }));
              }
            } catch {
              res.statusCode = 422;
              res.end(JSON.stringify({ detail: 'fixture_sample_only' }));
            }
          });
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-calculadoras-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
