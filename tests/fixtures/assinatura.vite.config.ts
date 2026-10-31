import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { temaInicial } from '../../scripts/tema-vite';
import { billingStatus } from './acesso';
export default defineConfig({
  root: fileURLToPath(new URL('./assinatura/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../public/', import.meta.url)),
  plugins: [
    react(),
    temaInicial(),
    {
      name: 'assinatura-simulada-somente-no-build-de-testes',
      configurePreviewServer(server) {
        const status = {
          ...billingStatus,
          access: 'READ_ONLY',
          status: 'AWAITING_CARD',
          trial_started_at: null,
          trial_ends_at: null,
          trial_confirmed: false,
          checkout_available: true,
          prices: [
            {
              id: 1,
              amount_minor: 12345,
              currency: 'BRL',
              frequency: 'MONTHLY',
            },
            {
              id: 2,
              amount_minor: 99000,
              currency: 'BRL',
              frequency: 'YEARLY',
            },
          ],
        };
        server.middlewares.use('/api/v1/billing/status', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(status));
        });
        server.middlewares.use('/api/v1/billing/subscribe', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              url: 'https://checkout.stripe.com/c/pay/disposable',
            }),
          );
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(
      new URL('../../dist-assinatura-fixture/', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
