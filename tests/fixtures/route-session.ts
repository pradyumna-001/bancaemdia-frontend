import type { QueryClient } from '@tanstack/react-query';
import { sessionContext } from '../../src/auth/protocol';
import { createSession } from '../../src/auth/session';
import { createAccessController } from '../../src/features/acesso/controller';

/** Unit route mounts use the same providers as the public application. */
export async function routeSession(queries: QueryClient) {
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Teste de rotas',
    email: 'rotas@example.org',
    session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
    csrf_token: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const service = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
    exclusive: async (_signal, work) => work(),
  });
  await service.resume();
  const access = createAccessController(service, queries);
  return {
    service,
    access,
    dispose() {
      access.dispose();
      service.dispose();
    },
  };
}
