import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, httpError } from '../api/error';
import { ErroApi } from './ErroApi';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('401 abre reautenticação com destino interno em outra aba e mantém formulário', () => {
  const { rerender } = render(
    <>
      <input aria-label="Odd" defaultValue="2.10" />
      <ErroApi
        error={new ApiError('http', { status: 401 })}
        intent="gravacao"
        destination="/banca?apagadas=1"
      />
    </>,
  );
  expect(
    screen.getByRole('link', { name: /Entrar novamente/ }),
  ).toHaveAttribute('href', '/login?destino=%2Fbanca%3Fapagadas%3D1');
  expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  rerender(
    <>
      <input aria-label="Odd" defaultValue="2.10" />
      <ErroApi
        error={new ApiError('http', { status: 402 })}
        intent="gravacao"
        destination="/banca?apagadas=1"
      />
    </>,
  );
  expect(
    screen.queryByRole('link', { name: /Entrar/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ver assinatura/ })).toHaveAttribute(
    'href',
    '/assinatura?apagadas=1',
  );
  expect(screen.getByRole('textbox')).toHaveValue('2.10');
});
it('descarta destino externo e respeita integração de reautenticação por callback', () => {
  const callback = vi.fn();
  const { rerender } = render(
    <ErroApi
      error={new ApiError('http', { status: 401 })}
      intent="leitura"
      destination="https://external.example"
    />,
  );
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    '/login?destino=%2F',
  );
  rerender(
    <ErroApi
      error={new ApiError('http', { status: 401 })}
      intent="leitura"
      actions={{ entrar: callback }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Entrar novamente' }));
  expect(callback).toHaveBeenCalledTimes(1);
});
it('foca aviso uma vez, indica somente campos locais e permite voltar ao campo', () => {
  const error = httpError(
    new Response(null, { status: 422 }),
    { detail: [{ loc: ['body', 'odd'] }, { loc: ['body', 'PRIVATE_FIELD'] }] },
    true,
  );
  const fields = [
    { scope: 'body' as const, field: 'odd', label: 'Odd', id: 'odd-input' },
  ];
  const { rerender } = render(
    <>
      <label htmlFor="odd-input">Odd</label>
      <input id="odd-input" defaultValue="2.10" aria-invalid="true" />
      <ErroApi error={error} intent="gravacao" fields={fields} />
    </>,
  );
  expect(screen.getByRole('region')).toHaveFocus();
  expect(screen.getByText('Confira Odd')).toBeVisible();
  expect(screen.queryByText('PRIVATE_FIELD')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confira Odd' }));
  expect(screen.getByRole('textbox')).toHaveFocus();
  rerender(
    <>
      <label htmlFor="odd-input">Odd</label>
      <input id="odd-input" defaultValue="2.10" />
      <ErroApi
        error={httpError(
          new Response(null, { status: 422 }),
          { detail: [{ loc: ['body', 'odd'] }] },
          true,
        )}
        intent="gravacao"
        fields={fields}
      />
    </>,
  );
  expect(screen.getByRole('textbox')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Revisar pedido' }));
  expect(screen.getByRole('textbox')).toHaveValue('2.10');
});
it('Retry-After bloqueia só a nova tentativa afetada; revisar filtros continua disponível', async () => {
  vi.useFakeTimers();
  const retry = vi.fn();
  const revise = vi.fn();
  const error = httpError(
    new Response(null, { status: 429, headers: { 'Retry-After': '2' } }),
    null,
    false,
  );
  const { unmount } = render(
    <ErroApi
      error={error}
      intent="leitura"
      actions={{ tentar: retry, revisar: revise }}
    />,
  );
  const button = screen.getByRole('button', { name: 'Tentar novamente' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Revisar filtros' }));
  expect(revise).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(retry).toHaveBeenCalledTimes(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('escrita incerta oferece conferência e nunca botão de reenviar', () => {
  const reconcile = vi.fn();
  const revise = vi.fn();
  render(
    <ErroApi
      error={new ApiError('timeout', { mutation: true })}
      intent="gravacao"
      actions={{ conferir: reconcile, revisar: revise, tentar: vi.fn() }}
    />,
  );
  expect(
    screen.queryByRole('button', { name: 'Tentar novamente' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir resultado' }));
  expect(reconcile).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao formulário' }));
  expect(revise).toHaveBeenCalledTimes(1);
});
