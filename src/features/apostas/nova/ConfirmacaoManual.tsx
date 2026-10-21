import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { getApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi } from '../../../components/ErroApi';
import { useRetryAfter } from '../../../lib/useRetryAfter';
import { PATH, validarRecibo, uuidValido, type Recibo } from './protocol';
import './nova.css';

export function ConfirmacaoManual({
  api,
  chave,
  search,
}: {
  api: ReturnType<typeof getApiClient>;
  chave: string;
  search: string;
}) {
  const params = new URLSearchParams(search);
  const id = params.get('manual_intencao');
  const valid = uuidValido(id) && params.getAll('manual_intencao').length === 1;
  return valid ? (
    <Confirmacao key={id} api={api} chave={chave} id={id} search={search} />
  ) : null;
}
function Confirmacao({
  api,
  chave,
  id,
  search,
}: {
  api: ReturnType<typeof getApiClient>;
  chave: string;
  id: string;
  search: string;
}) {
  const auth = useAuth()!;
  const [receipt, setReceipt] = useState<Recibo>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(true);
  const controller = useRef<AbortController>();
  const alive = useRef(false);
  const wait = useRetryAfter(error);
  const consult = useRef<() => Promise<void>>();
  async function load() {
    if (controller.current || wait) return;
    const request = new AbortController();
    controller.current = request;
    const scope = auth.service.capture();
    const current = () =>
      alive.current && !request.signal.aborted && scope.isCurrent();
    setBusy(true);
    setError(undefined);
    try {
      const data = await auth.service.read(async () =>
        validarRecibo(
          (
            await api.GET(PATH, {
              signal: request.signal,
              params: { path: { intencao_id: id } },
            })
          ).data,
          id,
        ),
      );
      if (data.aposta_chave !== chave) throw new ApiError('invalid_response');
      if (current()) setReceipt(data);
    } catch (cause) {
      if (current()) setError(cause);
    } finally {
      if (controller.current === request) {
        controller.current = undefined;
        if (alive.current) setBusy(false);
      }
    }
  }
  useLayoutEffect(() => {
    consult.current = load;
  });
  useEffect(() => {
    alive.current = true;
    const clean = () => {
      controller.current?.abort();
      setReceipt(undefined);
      setError(undefined);
    };
    const unregister = auth.service.registerCleanup(clean);
    void consult.current?.();
    return () => {
      alive.current = false;
      clean();
      controller.current = undefined;
      unregister();
    };
  }, [auth.service]);
  const reviewLink = (review: string) => {
    const next = new URLSearchParams(search);
    next.set('revisao_item', review);
    return '/revisao?' + next.toString();
  };
  const retryable = !(
    error instanceof ApiError &&
    [401, 403, 405, 410, 422].includes(error.status)
  );
  return (
    <section
      className="nova-confirmacao"
      aria-label="Confirmação do registro manual"
    >
      {busy && <p role="status">Consultando confirmação original…</p>}
      {!busy && !receipt && !error && (
        <>
          <p>A confirmação precisa ser consultada novamente nesta sessão.</p>
          <button
            type="button"
            disabled={wait}
            onClick={() => void consult.current?.()}
          >
            Consultar confirmação novamente
          </button>
        </>
      )}
      {receipt && (
        <>
          <h2>Registro manual confirmado</h2>
          <p>
            A confirmação é do registro original. Os dados da aposta abaixo
            mostram a leitura atual.
          </p>
          {receipt.avisos.map((notice) => (
            <div key={notice.revisao_id}>
              <p>
                {notice.codigo === 'conta_ausente'
                  ? 'A conta desta aposta precisa ser identificada.'
                  : 'Há mais de uma conta possível para esta aposta.'}{' '}
                A referência de Revisão foi criada no registro; ela pode já ter
                sido resolvida.
              </p>
              <Link to={reviewLink(notice.revisao_id)}>
                Conferir conta na Revisão
              </Link>
            </div>
          ))}
        </>
      )}
      {!!error && (
        <>
          <ErroApi
            error={error}
            intent="leitura"
            destination={'/aposta/' + encodeURIComponent(chave) + search}
          />
          <p>
            A confirmação original não está disponível nesta consulta. Isso não
            altera os dados atuais nem autoriza recriar a aposta.
          </p>
          {retryable && (
            <button
              type="button"
              disabled={busy || wait}
              onClick={() => void consult.current?.()}
            >
              Consultar confirmação novamente
            </button>
          )}
        </>
      )}
    </section>
  );
}
