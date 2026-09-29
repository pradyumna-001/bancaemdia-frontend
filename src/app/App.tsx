import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import './pages.css';

export function App({
  router,
  queryClient,
}: {
  router: ReturnType<typeof createBrowserRouter>;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
