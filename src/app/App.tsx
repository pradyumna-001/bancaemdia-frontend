import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import './pages.css';
import { Ambiente } from './Ambiente';
import type { AppEnvironment } from '../lib/config';

export function App({
  router,
  queryClient,
  ambiente = 'production',
}: {
  router: ReturnType<typeof createBrowserRouter>;
  queryClient: QueryClient;
  ambiente?: AppEnvironment;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <Ambiente ambiente={ambiente} />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
