import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as api from '../../api/client';
import * as config from '../../lib/config';
import { parseConfig } from '../../lib/config';
import { ApiError } from '../../api/error';
import { ProvedorAuth } from '../../auth/ProvedorAuth';
import { createSession, type SessionService } from '../../auth/session';
import { sessionContext } from '../../auth/protocol';
import {
  acceptedUpload,
  partialUpload,
  betsWithUnknownValues,
} from '../../../tests/fixtures/api/responses';
import { EnviarPage } from './EnviarPage';
import { useJob } from './useJob';
import { projetarJob } from './job';

vi.mock('./useJob', () => ({ useJob: vi.fn() }));
const settings = parseConfig({ VITE_API_URL: 'https://site.example.org' });
const services: SessionService[] = [];
const resume = vi.fn(() => true);
beforeEach(() => {
  vi.spyOn(config, 'getConfig').mockReturnValue(settings);
  vi.mocked(useJob).mockReturnValue({ fase: 'inativo', retomar: resume });
});
afterEach(() => {
  services.splice(0).forEach((s) => s.dispose());
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function json(data: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
function Location() {
  const location = useLocation();
  return (
    <output data-testid="url">{location.pathname + location.search}</output>
  );
}
async function setup(
  fetcher: (r: Request) => Promise<Response> = async () =>
    json(acceptedUpload, 202),
  path = '/enviar?estado=GREEN&apagadas=1',
) {
  const person = sessionContext({
    usuario_id: 1,
    nome: 'Teste',
    email: 'teste@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  });
  const service = createSession({
    baseUrl: settings.apiUrl,
    queryClient: new QueryClient(),
    exclusive: async (_signal, work) => work(),
    transport: {
      read: async () => person,
      renew: async () => person,
      logout: async () => {},
    },
  });
  services.push(service);
  await service.resume();
  vi.spyOn(api, 'getApiClient').mockReturnValue(
    api.createApiClient(settings, { captureSession: service.capture, fetcher }),
  );
  const view = render(
    <ProvedorAuth service={service}>
      <MemoryRouter initialEntries={[path]}>
        <EnviarPage />
        <Location />
      </MemoryRouter>
    </ProvedorAuth>,
  );
  return { ...view, service };
}
function select(name = 'result.json', contents = '{}') {
  fireEvent.change(screen.getByLabelText('Arquivo do export'), {
    target: { files: [new File([contents], name)] },
  });
}
function submit() {
  fireEvent.submit(document.querySelector('form')!);
}

it('envia multipart e CSRF uma vez, persiste somente UUID e preserva filtros', async () => {
  const fetcher = vi.fn(async (request: Request) => {
    void request;
    return json(
      {
        ...acceptedUpload,
        status_url: 'https://hostile.example.org',
        aviso: 'PRIVATE',
        estimated_cost_usd: 98,
      },
      202,
    );
  });
  await setup(fetcher);
  submit();
  expect(fetcher).not.toHaveBeenCalled();
  select();
  submit();
  submit();
  await waitFor(() =>
    expect(screen.getByTestId('url')).toHaveTextContent(
      `envio=${acceptedUpload.job_id}`,
    ),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  const request = fetcher.mock.calls[0]![0];
  expect(request.method).toBe('POST');
  expect(request.headers.has('X-CSRF-Token')).toBe(true);
  expect(screen.getByTestId('url')).toHaveTextContent(
    'estado=GREEN&apagadas=1',
  );
  expect(screen.queryByLabelText('Arquivo do export')).not.toBeInTheDocument();
  expect(
    screen.queryByText(/PRIVATE|98|Autorizar|estimativa/i),
  ).not.toBeInTheDocument();
});

it.each([
  ['errado.html', '{}'],
  ['result.json', ''],
])('recusa formato ou arquivo vazio (%s) sem POST', async (name, contents) => {
  const fetcher = vi.fn();
  await setup(fetcher);
  select(name, contents);
  expect(screen.getByRole('alert')).toHaveTextContent('ZIP ou JSON');
  submit();
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Arquivo do export'), {
    target: { files: [] },
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each([
  'envio=errado',
  `envio=${acceptedUpload.job_id}&envio=${acceptedUpload.job_id}`,
])('UUID inválido/duplicado não consulta nem reenvia (%s)', async (query) => {
  const fetcher = vi.fn();
  await setup(fetcher, `/enviar?estado=RED&${query}`);
  expect(
    screen.getByText('Não foi possível identificar o envio'),
  ).toBeInTheDocument();
  expect(useJob).toHaveBeenLastCalledWith(undefined);
  fireEvent.click(
    screen.getByRole('button', { name: 'Escolher outro arquivo' }),
  );
  expect(screen.getByTestId('url')).toHaveTextContent('/enviar?estado=RED');
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  ['completo', 'Importação concluída'],
  ['parcial', 'Importação concluída com pendências'],
  ['vazio', 'Nenhuma aposta foi importada'],
  ['falha', 'O processamento não foi concluído'],
] as const)(
  'apresenta resultado %s com contagens exclusivas da API',
  async (resultado, title) => {
    vi.mocked(useJob).mockReturnValue({
      fase: 'encerrado',
      dados: projetarJob(partialUpload, acceptedUpload.job_id),
      resultado,
      retomar: resume,
    });
    await setup(undefined, `/enviar?envio=${acceptedUpload.job_id}`);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByLabelText('Progresso 100%')).toHaveAttribute(
      'value',
      '100',
    );
    expect(
      screen.getByText('Apostas importadas').nextSibling,
    ).toHaveTextContent('2');
    fireEvent.click(
      screen.getByRole('button', { name: 'Escolher outro arquivo' }),
    );
    expect(screen.getByTestId('url')).toHaveTextContent('/enviar');
  },
);

it('pausa só observação, retoma GET e não converte percentual desconhecido em zero', async () => {
  const dados = projetarJob(partialUpload, acceptedUpload.job_id);
  vi.mocked(useJob).mockReturnValue({
    fase: 'observando',
    etapa: 'Processando',
    dados: { ...dados, progress: { ...dados.progress, percent: undefined } },
    retomar: resume,
  });
  await setup(undefined, `/enviar?envio=${acceptedUpload.job_id}`);
  expect(screen.getByLabelText('Progresso não informado')).not.toHaveAttribute(
    'value',
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Pausar acompanhamento' }),
  );
  expect(useJob).toHaveBeenLastCalledWith(undefined);
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar acompanhamento' }),
  );
  expect(useJob).toHaveBeenLastCalledWith(acceptedUpload.job_id);
});

it('janela finita permite retomar consulta, erro GET mantém saída estilizada', async () => {
  vi.mocked(useJob).mockReturnValue({
    fase: 'interrompido',
    motivo: 'limite',
    retomar: resume,
  });
  const view = await setup(undefined, `/enviar?envio=${acceptedUpload.job_id}`);
  fireEvent.click(
    screen.getByRole('button', { name: 'Continuar acompanhamento' }),
  );
  expect(resume).toHaveBeenCalled();
  vi.mocked(useJob).mockReturnValue({
    fase: 'interrompido',
    erro: new ApiError('http', { status: 503 }),
    retomar: resume,
  });
  view.rerender(
    <MemoryRouter initialEntries={[`/enviar?envio=${acceptedUpload.job_id}`]}>
      <EnviarPage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
});

it.each([400, 413, 422, 402, 429])(
  'recusa %i preserva arquivo e não repete automaticamente',
  async (status) => {
    const fetcher = vi.fn(async () =>
      json(
        { detail: [{ loc: ['body', 'file'], input: 'PRIVATE', msg: 'TRACE' }] },
        status,
        status === 429 ? { 'Retry-After': '300' } : {},
      ),
    );
    await setup(fetcher);
    select();
    submit();
    await screen.findByRole('alert');
    expect(
      screen.getByText('Arquivo escolhido: result.json'),
    ).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
    if (status === 402 || status === 429)
      expect(
        screen.getByRole('button', { name: 'Enviar export' }),
      ).toBeDisabled();
    else
      fireEvent.click(screen.getByRole('button', { name: 'Revisar pedido' }));
  },
);

it.each([500, 503, 202])(
  'resposta ambígua %i exige GET separado e nova seleção, sem reenvio',
  async (status) => {
    const fetcher = vi.fn(async (r: Request) =>
      r.method === 'GET'
        ? json(betsWithUnknownValues)
        : json(
            status === 202 ? { ...acceptedUpload, job_id: 'invalid' } : {},
            status,
          ),
    );
    await setup(fetcher);
    select();
    submit();
    await screen.findByRole('alert');
    expect(
      screen.getByRole('button', { name: 'Enviar export' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Conferir resultado' }));
    await screen.findByText(/Consulta atualizada/);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const request = fetcher.mock.calls[1]![0];
    expect(request.method).toBe('GET');
    expect(request.url).toContain('incluir_apagadas=true');
    fireEvent.click(
      screen.getByRole('button', { name: 'Iniciar um novo envio' }),
    );
    expect(
      screen.getByRole('button', { name: 'Enviar export' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Arquivo do export')).toHaveValue('');
  },
);

it('falha da consulta permite apenas outra leitura, não POST', async () => {
  let reads = 0;
  const fetcher = vi.fn(async (r: Request) =>
    r.method === 'GET'
      ? ++reads === 1
        ? json({}, 503)
        : json(betsWithUnknownValues)
      : json({}, 500),
  );
  await setup(fetcher);
  select();
  submit();
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Conferir resultado' }));
  fireEvent.click(screen.getByRole('button', { name: 'Conferir resultado' }));
  await screen.findByRole('button', { name: 'Tentar novamente' });
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText(/Consulta atualizada/);
  expect(fetcher.mock.calls.filter(([r]) => r.method === 'POST')).toHaveLength(
    1,
  );
});

it('recusa resposta inválida na consulta e permite revisar o resultado de um job falho', async () => {
  vi.mocked(useJob).mockReturnValue({
    fase: 'encerrado',
    resultado: 'falha',
    retomar: resume,
  });
  const fetcher = vi.fn(async () =>
    json({ ...betsWithUnknownValues, pagination: { total: -1 } }),
  );
  await setup(fetcher, `/enviar?envio=${acceptedUpload.job_id}`);
  fireEvent.click(screen.getByRole('button', { name: 'Conferir resultado' }));
  await screen.findByRole('alert');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('desmontar durante POST descarta o resultado e aborta espera', async () => {
  let complete!: (r: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  const view = await setup(fetcher);
  select();
  submit();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => complete(json(acceptedUpload, 202)));
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('saída limpa arquivo privado e impede resposta tardia de instalar UUID', async () => {
  let complete!: (r: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  const view = await setup(fetcher);
  select();
  submit();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await act(async () => {
    await view.service.logout();
    complete(json(acceptedUpload, 202));
  });
  expect(
    screen.queryByText('Arquivo escolhido: result.json'),
  ).not.toBeInTheDocument();
  expect(screen.getByTestId('url')).not.toHaveTextContent('envio=');
});

it('nova consulta da mesma sessão interrompe POST como resultado desconhecido e bloqueia replay', async () => {
  let complete!: (r: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  const view = await setup(fetcher);
  select();
  submit();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await act(async () => {
    await view.service.resume();
    complete(json(acceptedUpload, 202));
  });
  expect(
    screen.getByText('Arquivo escolhido: result.json'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar export' })).toBeDisabled();
  expect(
    screen.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('url')).not.toHaveTextContent('envio=');
  submit();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
