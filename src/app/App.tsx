import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import './pages.css';
import { Ambiente } from './Ambiente';
import type { AppEnvironment } from '../lib/config';
import { ProvedorAcesso } from '../features/acesso/ProvedorAcesso';
import type { AccessController } from '../features/acesso/controller';

export function App({
  router,
  queryClient,
  ambiente = 'production',
  access,
}: {
  router: ReturnType<typeof createBrowserRouter>;
  queryClient: QueryClient;
  ambiente?: AppEnvironment;
  access?: AccessController;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <Ambiente ambiente={ambiente} />
      {access ? (
        <ProvedorAcesso controller={access}>
          <RouterProvider router={router} />
        </ProvedorAcesso>
      ) : (
        <RouterProvider router={router} />
      )}
    </QueryClientProvider>
  );
}
