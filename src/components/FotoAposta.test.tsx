import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createApiClient } from '../api/client';
import { parseConfig } from '../lib/config';
import { ProvedorAuth } from '../auth/ProvedorAuth';
import { createSession } from '../auth/session';
import { sessionContext } from '../auth/protocol';
import { FotoAposta } from './FotoAposta';
import { Blob as NodeBlob } from 'node:buffer';

const cleanups: Array<() => void> = [];
beforeEach(() => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('URL', URL);
  URL.createObjectURL = vi.fn(() => 'blob:foto-privada');
  URL.revokeObjectURL = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const image = () =>
  new Response(new Blob(['imagem'], { type: 'image/png' }), {
    headers: { 'Content-Type': 'image/png' },
  });
const failure = (status: number, retry?: string) =>
  new Response('{"detail":"privado"}', {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(retry ? { 'Retry-After': retry } : {}),
    },
  });
async function open(read = async () => image()) {
  const queries = new QueryClient();
  const context = sessionContext({
    usuario_id: 1,
    nome: 'Teste',
    email: 'test@example.org',
    session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const session = createSession({
    baseUrl: 'http://127.0.0.1:8000',
    queryClient: queries,
    transport: {
      read: async () => context,
      renew: async () => context,
      logout: async () => {},
    },
    exclusive: async (_signal, work) => work(),
  });
  await session.resume();
  const requests: Request[] = [];
  const client = createApiClient(
    parseConfig({ VITE_API_URL: 'http://127.0.0.1:8000' }),
    {
      captureSession: session.capture,
      fetcher: async (req) => {
        requests.push(req);
        return read();
      },
    },
  );
  const tree = (chave: string) => (
    <MemoryRouter>
      <ProvedorAuth service={session}>
        <FotoAposta chave={chave} client={client} />
      </ProvedorAuth>
    </MemoryRouter>
  );
  const view = render(tree('chave/segura'));
  cleanups.push(() => {
    view.unmount();
    session.dispose();
  });
  return { session, requests, view, tree };
}
it('não consulta sem sessão', () => {
  render(<FotoAposta chave="teste" />);
  expect(screen.getByRole('status')).toHaveTextContent('Entre');
});
it('só carrega com gesto, codifica a chave, não armazena nem duplica pedidos', async () => {
  const { requests } = await open();
  expect(requests).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  expect(await screen.findByRole('img')).toHaveAttribute('loading', 'lazy');
  expect(requests).toHaveLength(1);
  expect(requests[0]!.url).toContain('chave%2Fsegura/foto');
  expect(requests[0]!.cache).toBe('no-store');
  expect(requests[0]!.headers.has('Authorization')).toBe(false);
  expect(requests[0]!.headers.has('X-CSRF-Token')).toBe(false);
  expect(localStorage.length + sessionStorage.length).toBe(0);
});
it('amplia, fecha e devolve o foco', async () => {
  await open();
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  const button = await screen.findByRole('button', { name: 'Ampliar foto' });
  await userEvent.click(button);
  expect(screen.getByRole('dialog')).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Fechar foto ampliada' }),
  );
  await waitFor(() => expect(button).toHaveFocus());
  await userEvent.click(button);
  fireEvent(screen.getByRole('dialog'), new Event('cancel'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('revoga a URL ao trocar de aposta e desmontar', async () => {
  const { view, tree } = await open();
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await screen.findByRole('img');
  view.rerender(tree('outra'));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-privada');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await screen.findByRole('img');
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});
it('logout limpa a imagem, inclusive ampliada', async () => {
  const { session } = await open();
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await userEvent.click(
    await screen.findByRole('button', { name: 'Ampliar foto' }),
  );
  await act(() => session.logout());
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it('ignora resposta tardia depois de sair', async () => {
  let resolve!: (response: Response) => void;
  const { view } = await open(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await waitFor(() => expect(resolve).toBeDefined());
  view.unmount();
  await act(async () => {
    resolve(image());
    await Promise.resolve();
  });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('404 mostra ausência segura, sem repetir ou revelar motivo', async () => {
  const { requests } = await open(async () => failure(404));
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  expect(
    await screen.findByText(
      'Não há foto disponível para consulta nesta aposta.',
    ),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it.each([405, 403])('não repete erro %s', async (status) => {
  const { requests } = await open(async () => failure(status));
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await screen.findByRole('alert');
  expect(requests).toHaveLength(1);
  expect(screen.queryByText('privado')).not.toBeInTheDocument();
});
it('422 de mídia tem mensagem própria e não pede alteração de filtros', async () => {
  const { requests } = await open(async () => failure(422));
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  expect(
    await screen.findByText(
      'Não foi possível exibir esta imagem com segurança.',
    ),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(screen.queryByText(/filtros/)).not.toBeInTheDocument();
});
it.each(['image/svg+xml', 'text/html', 'image/png'])(
  'recusa MIME não permitido ou imagem vazia: %s',
  async (mime) => {
    await open(
      async () =>
        new Response(
          new Blob([mime === 'image/png' ? '' : 'html'], { type: mime }),
          { headers: { 'Content-Type': mime } },
        ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
    expect(
      await screen.findByText(
        'Não foi possível exibir esta imagem com segurança.',
      ),
    ).toBeVisible();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  },
);
it('falha de decodificação revoga o blob e não bloqueia o restante', async () => {
  await open();
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  fireEvent.error(await screen.findByRole('img'));
  expect(
    screen.getByText('Não foi possível exibir esta imagem com segurança.'),
  ).toBeVisible();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it('Retry-After longo encerra automático e bloqueia recuperação antecipada', async () => {
  const { requests } = await open(async () => failure(503, '120'));
  await userEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await screen.findByRole('alert');
  expect(requests).toHaveLength(1);
  expect(screen.getByRole('button')).toBeDisabled();
});
it('500 tem apenas uma repetição automática', async () => {
  vi.useFakeTimers();
  const { requests } = await open(async () => failure(500));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });
  expect(requests).toHaveLength(2);
  expect(screen.getByRole('alert')).toBeVisible();
});
it('503 cancela backoff ao sair', async () => {
  vi.useFakeTimers();
  const { view, requests } = await open(async () => failure(503, '5'));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir foto' }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  view.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(requests).toHaveLength(1);
});
