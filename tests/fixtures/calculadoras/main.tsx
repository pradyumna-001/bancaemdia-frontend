// Session injection is exclusive to this separate test build.
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ProvedorAuth } from '../../../src/auth/ProvedorAuth';
import { createSession } from '../../../src/auth/session';
import { sessionContext } from '../../../src/auth/protocol';
import { createAppQueryClient } from '../../../src/app/queryClient';
import { Shell } from '../../../src/app/Shell';
import { parseConfig } from '../../../src/lib/config';
import { createApiClient } from '../../../src/api/client';
import { createAccessController } from '../../../src/features/acesso/controller';
import { ProvedorAcesso } from '../../../src/features/acesso/ProvedorAcesso';
import { CalculadorasPage } from '../../../src/features/calculadoras/CalculadorasPage';
import '../../../src/styles/base.css';
import '../../../src/app/pages.css';

const queries = createAppQueryClient();
const context = sessionContext({
  usuario_id: 1,
  nome: 'Demonstração',
  email: 'sandbox@example.org',
  session_version: `${crypto.randomUUID()}:1`,
  csrf_token: crypto.randomUUID(),
  refresh_required: false,
  access_expires_at: '2030-01-01T00:00:00Z',
  session_expires_at: '2030-01-02T00:00:00Z',
});
const session = createSession({
  baseUrl: location.origin,
  queryClient: queries,
  transport: {
    read: async () => context,
    renew: async () => context,
    logout: async () => {},
  },
  exclusive: async (_signal, work) => work(),
});
const controller = createAccessController(session, queries);
const client = createApiClient(parseConfig({ VITE_API_URL: location.origin }), {
  captureSession: session.capture,
  getCsrfToken: () => session.capture().csrfToken,
});
const router = createBrowserRouter([
  {
    path: '*',
    loader: session.resume,
    element: (
      <Shell>
        <aside className="pagina">
          <p className="legenda">
            Demonstração isolada • sessão e respostas simuladas
          </p>
          <p>
            Exemplos disponíveis: mercado com Casa vence e Visitante vence, odds
            2; distribuição com os mesmos nomes, odds 2,1 e entrada de R$
            100,00; cobertura com R$ 100,00, odds 1,5 e 3, comissão 0; banca de
            R$ 100,00 e percentual 1,25. Outros valores exigem a API real.
          </p>
        </aside>
        <CalculadorasPage client={client} />
      </Shell>
    ),
  },
]);
createRoot(document.getElementById('root')!).render(
  <ProvedorAuth service={session}>
    <QueryClientProvider client={queries}>
      <ProvedorAcesso controller={controller} client={client}>
        <RouterProvider router={router} />
      </ProvedorAcesso>
    </QueryClientProvider>
  </ProvedorAuth>,
);
