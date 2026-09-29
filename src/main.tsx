import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Não foi possível iniciar a aplicação.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
