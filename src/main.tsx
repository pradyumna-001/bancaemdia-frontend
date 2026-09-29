import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ConfigFailure } from './app/ConfigFailure';
import { initializeConfig } from './lib/config';

const root = document.getElementById('root');
if (!root) throw new Error('Não foi possível iniciar a aplicação.');

const application = createRoot(root);
application.render(
  <main>
    <p role="status">Iniciando o bancaemdia…</p>
  </main>,
);

initializeConfig().then(
  () =>
    application.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  (error: unknown) => application.render(<ConfigFailure error={error} />),
);
