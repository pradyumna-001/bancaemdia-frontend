import { StrictMode } from 'react';
import './styles/base.css';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ConfigFailure } from './app/ConfigFailure';
import { initializeConfig } from './lib/config';
import { createBrowserRouter } from 'react-router-dom';
import { createAppRoutes } from './app/routes';
import { createAppQueryClient } from './app/queryClient';

const root = document.getElementById('root');
if (!root) throw new Error('Não foi possível iniciar a aplicação.');

const application = createRoot(root);
application.render(
  <main className="pagina">
    <p role="status">Iniciando o bancaemdia…</p>
  </main>,
);

initializeConfig().then(
  () => {
    const queryClient = createAppQueryClient();
    const router = createBrowserRouter(createAppRoutes());
    application.render(
      <StrictMode>
        <App router={router} queryClient={queryClient} />
      </StrictMode>,
    );
  },
  (error: unknown) => application.render(<ConfigFailure error={error} />),
);
