import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getApiClient, type createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { recuperacaoErro } from '../../api/recovery';
import { useAuth } from '../../auth/ProvedorAuth';
import { ErroApi } from '../../components/ErroApi';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { useAcesso } from '../acesso/ProvedorAcesso';
import { nomeFuso, preferenciaFuso } from './fuso';
import { SeletorFuso } from './SeletorFuso';

const operation = 'PATCH /api/v1/painel/preferencias';

// The same server resource is reused by Análises (#57), without a second preference.
export function FusoPreferencia({
  client,
}: {
  client?: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const access = useAcesso();
  const api = client ?? getApiClient();
  const queries = useQueryClient();
  const location = useLocation();
  const inputId = useId();
  const [draft, setDraft] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [needsCheck, setNeedsCheck] = useState(false);
  const [notice, setNotice] = useState('');
  const life = useRef({ active: true });
  const pending = useRef<AbortController>();
  const key = [
    'preferencia-fuso',
    auth?.state.privateEpoch,
    auth?.state.person?.id,
  ];
  const query = useQuery({
    queryKey: key,
    enabled: auth?.state.phase === 'authenticated',
    queryFn: ({ signal }) =>
      auth!.service.read(async () =>
        preferenciaFuso(
          (await api.GET('/api/v1/painel/preferencias', { signal })).data,
        ),
      ),
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const waiting = useRetryAfter(error);
  const queryWaiting = useRetryAfter(query.error);
  const selected = draft ?? query.data?.fuso_horario;
  const blocked =
    busy || query.isFetching || query.isError || waiting || queryWaiting;
  useEffect(() => {
    const current = life.current;
    current.active = true;
    return () => {
      current.active = false;
      pending.current?.abort();
    };
  }, []);
  async function consult() {
    if (!auth || busy || query.isFetching || waiting || queryWaiting) return;
    const scope = auth.service.capture();
    const result = await query.refetch();
    if (!life.current.active || !scope.isCurrent() || result.error) return;
    setNeedsCheck(false);
    setError(undefined);
    setNotice(`Fuso atual confirmado: ${nomeFuso(result.data!.fuso_horario)}.`);
  }
  async function save() {
    if (
      !auth ||
      !access?.can(operation) ||
      pending.current ||
      blocked ||
      needsCheck ||
      !selected ||
      selected === query.data?.fuso_horario
    )
      return;
    const scope = auth.service.capture();
    const controller = new AbortController();
    pending.current = controller;
    const current = () =>
      life.current.active && scope.isCurrent() && !controller.signal.aborted;
    setBusy(true);
    setError(undefined);
    setNotice('');
    try {
      const data = await access.run(operation, async () => {
        const result = await api.PATCH('/api/v1/painel/preferencias', {
          body: { fuso_horario: selected },
          signal: controller.signal,
        });
        if (result.response.status !== 200)
          throw new ApiError('invalid_response', { mutation: true });
        return preferenciaFuso(result.data, true);
      });
      if (!current()) return;
      queries.setQueryData(key, data);
      setDraft(data.fuso_horario);
      setNotice(
        `Fuso salvo: ${nomeFuso(data.fuso_horario)}. As análises usarão essa divisão dos dias.`,
      );
    } catch (cause) {
      if (!current()) return;
      const safe =
        cause instanceof ApiError
          ? cause
          : new ApiError('invalid_response', { mutation: true });
      setError(safe);
      setNeedsCheck(safe.outcomeUnknown || safe.status === 409);
    } finally {
      if (pending.current === controller) pending.current = undefined;
      if (current()) setBusy(false);
    }
  }
  return (
    <section className="configuracoes-card" aria-labelledby="fuso-titulo">
      <h2 id="fuso-titulo">Dias das análises</h2>
      <p>
        O fuso define onde cada dia começa e termina nas análises do Painel.
        Alterá-lo não muda os lançamentos nem seus valores.
      </p>
      {query.isPending && <p role="status">Consultando seu fuso…</p>}
      {query.error && (
        <ErroApi
          error={query.error}
          intent="leitura"
          actions={{
            tentar: () => {
              void consult();
            },
          }}
        />
      )}
      {query.data && selected && (
        <>
          <p>
            Salvo na conta: <strong>{nomeFuso(query.data.fuso_horario)}</strong>
            {query.isError
              ? ' · Não foi possível atualizar esta consulta.'
              : ''}
          </p>
          <div className="fuso-form">
            <SeletorFuso
              inputId={inputId}
              value={selected}
              disabled={blocked || !access?.can(operation)}
              onChange={(value) => {
                setDraft(value);
                setNotice('');
              }}
            />
            <button
              type="button"
              disabled={
                blocked ||
                needsCheck ||
                !access?.can(operation) ||
                selected === query.data.fuso_horario
              }
              onClick={() => {
                void save();
              }}
            >
              {busy ? 'Salvando…' : 'Salvar fuso'}
            </button>
          </div>
          {access?.phase === 'read-only' && (
            <p>
              Você pode consultar o fuso salvo. A alteração fica disponível com
              acesso para editar.
            </p>
          )}
        </>
      )}
      {!!error && (
        <ErroApi
          error={error}
          intent="gravacao"
          destination={location.pathname + location.search}
          fields={[
            {
              scope: 'body',
              field: 'fuso_horario',
              label: 'Fuso das análises',
              id: inputId,
            },
          ]}
        />
      )}
      {needsCheck && (
        <p>Confira o fuso salvo antes de fazer uma nova alteração.</p>
      )}
      {(!query.error ||
        recuperacaoErro(query.error, 'leitura').action === 'tentar') && (
        <button
          type="button"
          disabled={busy || waiting || queryWaiting || query.isFetching}
          onClick={() => {
            void consult();
          }}
        >
          Consultar fuso salvo
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
