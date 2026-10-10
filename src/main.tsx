import { StrictMode } from 'react';
import './styles/base.css';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ConfigFailure } from './app/ConfigFailure';
import { getConfig, initializeConfig } from './lib/config';
import { createBrowserRouter } from 'react-router-dom';
import { createAppRoutes } from './app/routes';
import { createAppQueryClient } from './app/queryClient';
import { Logo } from './components/Logo';
import { ProvedorAuth } from './auth/ProvedorAuth';
import { browserExclusive, createSession } from './auth/session';
import { initializeApiClient } from './api/client';
import {
  restoreLoginFragment,
  sanitizeProtocolLocation,
} from './auth/returnDestination';
import { ApiError } from './api/error';
import { createAccessController } from './features/acesso/controller';
import {
  restoreBillingReturn,
  sanitizeBillingLocation,
} from './features/assinatura/returnDestination';

const root = document.getElementById('root');
if (!root) throw new Error('Não foi possível iniciar a aplicação.');

const application = createRoot(root);
sanitizeProtocolLocation(location, history);
sanitizeBillingLocation(location, history);
application.render(
  <main className="pagina">
    <header className="cabecalho-marca">
      <Logo />
    </header>
    <p role="status">Iniciando o bancaemdia…</p>
  </main>,
);

initializeConfig().then(
  () => {
    const queryClient = createAppQueryClient();
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      /* Fragment restoration is optional. */
    }
    restoreLoginFragment(location, history, storage);
    const billingReturning = restoreBillingReturn(location, history, storage);
    let channel: BroadcastChannel | undefined;
    try {
      if (typeof BroadcastChannel === 'function')
        channel = new BroadcastChannel('bancaemdia:identity');
    } catch {
      /* Web Locks still serialize refresh; secrets never use channel storage. */
    }
    const auth = createSession({
      baseUrl: getConfig().apiUrl,
      queryClient,
      exclusive: browserExclusive(),
      storage,
      channel,
    });
    const access = createAccessController(auth, queryClient);
    const api = initializeApiClient({
      captureSession: auth.capture,
      onUnauthorized: auth.unauthorized,
      onAccessDenied: access.denied,
      beforeMutation: (operation) => access.run(api, operation, async () => {}),
    });
    const consultarRevisao = (signal?: AbortSignal) =>
      auth.read(async () => {
        const result = await api.GET('/api/v1/revisao/stats', { signal });
        if (!result.data) throw new ApiError('invalid_response');
        return result.data;
      });
    const router = createBrowserRouter(
      createAppRoutes(auth.resume, consultarRevisao, billingReturning),
    );
    application.render(
      <StrictMode>
        <ProvedorAuth service={auth}>
          <App
            router={router}
            queryClient={queryClient}
            ambiente={getConfig().appEnv}
            access={access}
          />
        </ProvedorAuth>
      </StrictMode>,
    );
  },
  (error: unknown) => application.render(<ConfigFailure error={error} />),
);
