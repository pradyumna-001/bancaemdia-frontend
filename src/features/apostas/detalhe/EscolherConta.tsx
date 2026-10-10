import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { components } from '../../../api/schema';
import type { createApiClient } from '../../../api/client';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import { respostaPublicada } from '../../../api/readContract';
import { ApiError } from '../../../api/error';
import { recuperacaoErro } from '../../../api/recovery';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi } from '../../../components/ErroApi';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { dataHora } from '../../../lib/format';

export function EscolherConta({
  api,
  blocked,
  onChoose,
}: {
  api: ReturnType<typeof createApiClient>;
  blocked: boolean;
  onChoose: (id: number | null) => void;
}) {
  const auth = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState(false);
  const [page, setPage] = useState(1);
  const [tid, setTid] = useState<number>();
  const [selected, setSelected] = useState<number | null | undefined>();
  const identity = [auth?.state.privateEpoch, auth?.state.person?.id];
  const holders = useQuery({
    queryKey: ['titulares-aposta', ...identity, page],
    enabled: opened,
    queryFn: ({ signal }) =>
      auth!.service.read(async () => {
        const { data } = await api.GET('/api/v1/titulares', {
          signal,
          params: { query: { page, page_size: 20, include_archived: true } },
        });
        respostaPublicada(
          data,
          SITE_READ_CONTRACT['/api/v1/titulares']?.response,
        );
        if (!data || data.page !== page) throw new ApiError('invalid_response');
        return data;
      }),
    retryOnMount: false,
  });
  const matrix = useQuery({
    queryKey: ['matriz-aposta', ...identity, tid],
    enabled: opened && tid !== undefined,
    queryFn: ({ signal }) =>
      auth!.service.read(async () => {
        const { data } = await api.GET(
          '/api/v1/titulares/{titular_id}/matriz',
          { signal, params: { path: { titular_id: tid! } } },
        );
        respostaPublicada(
          data,
          SITE_READ_CONTRACT['/api/v1/titulares/{titular_id}/matriz']?.response,
        );
        if (!data || data.titular.id !== tid)
          throw new ApiError('invalid_response');
        return data;
      }),
    retryOnMount: false,
  });
  const wait = useRetryAfter(holders.error);
  const matrixWait = useRetryAfter(matrix.error);
  const showIntervals = (c: components['schemas']['ContaMatrizSaida']) =>
    c.historico_uso.length
      ? c.historico_uso
          .map(
            (interval) =>
              `${dataHora(interval.vigente_de, 'America/Sao_Paulo')} até ${interval.vigente_ate ? dataHora(interval.vigente_ate, 'America/Sao_Paulo') : 'intervalo aberto'}`,
          )
          .join('; ')
      : 'Sem intervalo de uso informado';
  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={blocked}
        onClick={() => {
          setOpened(true);
          setSelected(undefined);
          dialog.current!.showModal();
        }}
      >
        Escolher conta
      </button>
      <dialog
        ref={dialog}
        className="aposta-dialog"
        aria-labelledby="conta-aposta-titulo"
        onClose={() => {
          setOpened(false);
          trigger.current?.focus();
        }}
      >
        <h2 id="conta-aposta-titulo">Conta que fez a aposta</h2>
        <p>
          Escolha a conta que fez a aposta. A casa e a data do jogo serão
          conferidas antes de salvar. Contas históricas também aparecem.
        </p>
        {holders.isPending && <p role="status">Carregando titulares…</p>}
        {holders.error && (
          <ErroApi
            error={holders.error}
            intent="leitura"
            actions={
              recuperacaoErro(holders.error, 'leitura').action === 'tentar'
                ? {
                    tentar: () => {
                      if (!wait && !holders.isFetching) void holders.refetch();
                    },
                  }
                : {}
            }
          />
        )}
        <div className="aposta-escolhas" role="group" aria-label="Titulares">
          {holders.data?.data.map((h) => (
            <button
              key={h.id}
              type="button"
              disabled={wait || holders.isFetching}
              aria-pressed={tid === h.id}
              onClick={() => {
                setTid(h.id);
                setSelected(undefined);
              }}
            >
              {h.nome}
              {h.arquivado ? ' (arquivado)' : ''}
            </button>
          ))}
        </div>
        {holders.data && !holders.data.data.length && (
          <p>
            Não há titulares nesta página. Consulte seus cadastros em Contas e
            titulares.
          </p>
        )}
        {holders.data && (
          <div className="acoes">
            <button
              type="button"
              disabled={page === 1 || wait || holders.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Titulares anteriores
            </button>
            <span>Página {page}</span>
            <button
              type="button"
              disabled={
                page * 20 >= holders.data.total || wait || holders.isFetching
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Próximos titulares
            </button>
          </div>
        )}
        {tid !== undefined && matrix.isPending && (
          <p role="status">Carregando contas…</p>
        )}
        {matrix.error && (
          <ErroApi
            error={matrix.error}
            intent="leitura"
            actions={
              recuperacaoErro(matrix.error, 'leitura').action === 'tentar'
                ? {
                    tentar: () => {
                      if (!matrixWait && !matrix.isFetching)
                        void matrix.refetch();
                    },
                  }
                : {}
            }
          />
        )}
        <fieldset
          disabled={blocked || matrixWait || matrix.isFetching}
          className="aposta-escolhas"
        >
          <legend>Conta registrada na aposta</legend>
          <label>
            <input
              type="radio"
              name="conta-aposta"
              checked={selected === null}
              onChange={() => setSelected(null)}
            />
            Deixar sem conta atribuída
          </label>
          {matrix.data?.contas.map((c) => (
            <label key={c.conta_casa_id}>
              <input
                type="radio"
                name="conta-aposta"
                checked={selected === c.conta_casa_id}
                onChange={() => setSelected(c.conta_casa_id)}
              />
              <span>
                {c.apelido} — {c.casa_nome}
                {!c.ativa ? ' (inativa)' : ''}
                <small>{showIntervals(c)}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {matrix.data && !matrix.data.contas.length && (
          <p>Este titular não possui contas cadastradas.</p>
        )}
        <div className="acoes">
          <button
            type="button"
            disabled={
              selected === undefined ||
              blocked ||
              matrixWait ||
              matrix.isFetching
            }
            onClick={() => {
              onChoose(selected!);
              dialog.current!.close();
            }}
          >
            Confirmar conta
          </button>
          <button type="button" onClick={() => dialog.current!.close()}>
            Cancelar
          </button>
        </div>
      </dialog>
    </>
  );
}
