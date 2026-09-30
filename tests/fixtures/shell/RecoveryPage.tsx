// Component exercise only: this route/form never enters the public build.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '../../../src/api/client';
import { ApiError } from '../../../src/api/error';
import { paginacaoConsulta } from '../../../src/api/query';
import type { ConflictContext, ErrorIntent } from '../../../src/api/recovery';
import { ErroApi } from '../../../src/components/ErroApi';
import { Logo } from '../../../src/components/Logo';
import { PreferenciaTema } from '../../../src/components/PreferenciaTema';
import { parseConfig } from '../../../src/lib/config';
import { useRetryAfter } from '../../../src/lib/useRetryAfter';
import './recovery.css';

const client = createApiClient(parseConfig({ VITE_API_URL: location.origin }));
const fields = [
  { scope: 'body' as const, field: 'odd', id: 'recovery-odd', label: 'Odd' },
];
export function RecoveryPage() {
  const cache = useQueryClient();
  const [odd, setOdd] = useState('2.10');
  const [error, setError] = useState<unknown>();
  const [intent, setIntent] = useState<ErrorIntent>('leitura');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const waiting = useRetryAfter(error);
  const search = new URLSearchParams(location.search);
  const conflictValue = search.get('conflito');
  const conflict: ConflictContext | undefined =
    conflictValue === 'estado' ||
    conflictValue === 'idempotencia' ||
    conflictValue === 'previa'
      ? conflictValue
      : undefined;
  const uncertain = error instanceof ApiError && error.outcomeUnknown;
  const read = async (reconcile = false) => {
    setBusy(true);
    setMessage('');
    if (!reconcile) {
      setIntent('leitura');
      setError(undefined);
    }
    try {
      await cache.fetchQuery({
        queryKey: ['recovery-bets', search.toString()],
        staleTime: 0,
        queryFn: ({ signal }) =>
          client.GET('/api/v1/apostas', {
            signal,
            params: {
              query: {
                ...paginacaoConsulta('GET /api/v1/apostas', search),
                estado: search.get('estado'),
              },
            },
          }),
      });
      setMessage(
        reconcile
          ? 'Consulta atualizada. Confira o resultado antes de repetir; esta consulta não prova que a gravação falhou.'
          : 'Consulta atualizada com os mesmos filtros.',
      );
    } catch (failure) {
      if (!reconcile) setError(failure);
      else
        setMessage(
          'Não foi possível conferir o resultado. O pedido continua sem confirmação.',
        );
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    setError(undefined);
    setIntent('gravacao');
    setMessage('');
    try {
      const mutation = cache.getMutationCache().build(cache, {
        mutationFn: () =>
          client.POST('/api/v1/apostas', {
            body: {
              casa: 'betano',
              odd: Number(odd),
              stake_unidades: 1,
              freebet: false,
            },
          }),
      });
      await mutation.execute(undefined);
      setMessage('Pedido confirmado pelo serviço.');
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="pagina">
      <header className="cabecalho-marca">
        <Logo />
      </header>
      <h1>Recuperação de um pedido</h1>
      <p>
        Demonstração isolada para testes. Os valores digitados permanecem nesta
        página.
      </p>
      <p className="legenda">
        Filtro de estado: {search.get('estado') ?? 'Todos'}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="recovery-odd">Odd</label>
        <input
          id="recovery-odd"
          value={odd}
          onChange={(event) => setOdd(event.target.value)}
          aria-invalid={
            (error instanceof ApiError &&
              error.invalidFields.some(
                (field) => field.scope === 'body' && field.field === 'odd',
              )) ||
            undefined
          }
          aria-describedby={error ? 'recovery-error' : undefined}
        />
        <div className="acoes">
          <button type="submit" disabled={busy || uncertain}>
            Enviar
          </button>
          <button
            type="button"
            disabled={busy || (intent === 'leitura' && waiting)}
            onClick={() => void read(uncertain)}
          >
            Consultar
          </button>
        </div>
      </form>
      {busy && <p role="status">Aguardando resposta…</p>}
      {!!error && (
        <div id="recovery-error">
          <ErroApi
            error={error}
            intent={intent}
            conflict={conflict}
            destination={`/${location.search}`}
            fields={fields}
            actions={{
              tentar: () => void read(),
              conferir: () => void read(true),
              recarregar: () => void read(true),
              previa: () =>
                setMessage(
                  'A consumidora deverá consultar a prévia contratada antes de confirmar.',
                ),
              revisar: () => document.getElementById('recovery-odd')?.focus(),
            }}
          />
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <PreferenciaTema />
    </main>
  );
}
