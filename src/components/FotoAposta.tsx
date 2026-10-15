import { useCallback, useEffect, useRef, useState } from 'react';
import { createApiClient, getApiClient } from '../api/client';
import { ApiError } from '../api/error';
import { recuperacaoErro } from '../api/recovery';
import { atrasoConsulta, retryConsulta } from '../app/queryClient';
import { useAuth } from '../auth/ProvedorAuth';
import { useRetryAfter } from '../lib/useRetryAfter';
import { ErroApi } from './ErroApi';
import { caminhoRevisao } from '../features/revisao/identidade';
import './FotoAposta.css';

type Props = {
  chave: string;
  revisaoId?: string;
  client?: ReturnType<typeof createApiClient>;
  destination?: string;
};
export function FotoAposta(props: Props) {
  const auth = useAuth();
  return auth?.state.phase === 'authenticated' ? (
    <FotoPrivada
      key={`${auth.state.privateEpoch}:${props.revisaoId ?? props.chave}`}
      {...props}
    />
  ) : (
    <p role="status">Entre para consultar a foto.</p>
  );
}

function FotoPrivada({ chave, revisaoId, client, destination }: Props) {
  const auth = useAuth()!;
  const api = client ?? getApiClient();
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [absent, setAbsent] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [zoom, setZoom] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  const resource = useRef<string>();
  const controller = useRef<AbortController>();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const loader = useRef<HTMLButtonElement>(null);
  const restoreLoadFocus = useRef(false);
  const waiting = useRetryAfter(error);
  useEffect(() => {
    if (
      url &&
      restoreLoadFocus.current &&
      document.activeElement === document.body
    )
      trigger.current?.focus({ preventScroll: true });
  }, [url]);
  const release = useCallback(() => {
    controller.current?.abort();
    if (resource.current) URL.revokeObjectURL(resource.current);
    resource.current = undefined;
  }, []);
  useEffect(() => {
    alive.current = true;
    const unregister = auth.service.registerCleanup(release);
    return () => {
      alive.current = false;
      release();
      unregister();
    };
  }, [auth.service, release]);
  useEffect(() => {
    if (!zoom) return;
    const modal = dialog.current;
    const opener = trigger.current;
    modal?.showModal();
    modal?.querySelector('button')?.focus();
    return () => {
      modal?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [zoom]);

  async function load() {
    if (
      auth.service.getSnapshot().phase !== 'authenticated' ||
      pending.current ||
      waiting ||
      url ||
      absent ||
      invalid ||
      (error && recuperacaoErro(error, 'leitura').action !== 'tentar')
    )
      return;
    pending.current = true;
    restoreLoadFocus.current = document.activeElement === loader.current;
    const scope = auth.service.capture();
    const abort = new AbortController();
    controller.current = abort;
    const current = () =>
      alive.current && !abort.signal.aborted && scope.isCurrent();
    setBusy(true);
    setError(undefined);
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await auth.service.read(() =>
            revisaoId
              ? api.GET(
                  '/api/v1/revisao-operacional/revisoes/{revisao_id}/foto',
                  {
                    ...caminhoRevisao(revisaoId),
                    parseAs: 'blob',
                    signal: abort.signal,
                  },
                )
              : api.GET('/api/v1/apostas/{chave}/foto', {
                  params: { path: { chave } },
                  parseAs: 'blob',
                  signal: abort.signal,
                }),
          );
          const blob = response.data;
          if (
            !(blob instanceof Blob) ||
            !blob.size ||
            blob.size > 20 * 1024 * 1024 ||
            !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
              blob.type,
            )
          ) {
            if (current()) setInvalid(true);
            return;
          }
          if (!current()) return;
          setError(undefined);
          const next = URL.createObjectURL(blob);
          resource.current = next;
          setUrl(next);
          return;
        } catch (failure) {
          if (!current()) return;
          if (failure instanceof ApiError && failure.status === 404) {
            setAbsent(true);
            return;
          }
          if (failure instanceof ApiError && failure.status === 422) {
            setInvalid(true);
            return;
          }
          setError(failure);
          if (!retryConsulta(attempt, failure)) return;
          await new Promise<void>((resolve) => {
            const stop = () => {
              clearTimeout(timer);
              resolve();
            };
            const timer = setTimeout(
              () => {
                abort.signal.removeEventListener('abort', stop);
                resolve();
              },
              atrasoConsulta(attempt, failure),
            );
            abort.signal.addEventListener('abort', stop, { once: true });
          });
          if (!current()) return;
        }
      }
    } finally {
      pending.current = false;
      if (alive.current && !abort.signal.aborted) {
        setBusy(false);
        if (!scope.isCurrent()) setError(new ApiError('cancelled'));
      }
    }
  }
  function broken() {
    release();
    setUrl(undefined);
    setZoom(false);
    setInvalid(true);
  }
  return (
    <section className="foto-aposta" aria-label="Foto original da aposta">
      <div className="foto-aposta-espaco" aria-busy={busy}>
        {url ? (
          <img
            src={url}
            alt="Foto original vinculada a esta aposta"
            loading="lazy"
            width="800"
            height="600"
            onError={broken}
          />
        ) : (
          <p role="status">
            {absent
              ? 'Não há foto disponível para consulta nesta aposta.'
              : invalid
                ? 'Não foi possível exibir esta imagem com segurança.'
                : busy
                  ? 'Carregando foto…'
                  : 'Consulte a foto original quando precisar conferir a aposta.'}
          </p>
        )}
      </div>
      <p className="legenda">
        A disponibilidade depende da origem e da retenção da foto. Resolver a
        revisão ou apagar a aposta não prolonga a retenção.
      </p>
      {url ? (
        <button ref={trigger} type="button" onClick={() => setZoom(true)}>
          Ampliar foto
        </button>
      ) : !absent && !invalid && !error ? (
        <button
          ref={loader}
          type="button"
          disabled={busy}
          onClick={() => void load()}
        >
          Abrir foto
        </button>
      ) : null}
      {!!error && !invalid && (
        <ErroApi
          error={error}
          intent="leitura"
          destination={destination}
          actions={!busy ? { tentar: () => void load() } : {}}
        />
      )}
      {zoom && url && (
        <dialog
          ref={dialog}
          className="foto-aposta-zoom"
          aria-label="Foto ampliada"
          onCancel={() => setZoom(false)}
        >
          <button type="button" onClick={() => setZoom(false)}>
            Fechar foto ampliada
          </button>
          <img
            src={url}
            alt="Foto original vinculada a esta aposta, ampliada"
            loading="lazy"
            width="800"
            height="600"
            onError={broken}
          />
        </dialog>
      )}
    </section>
  );
}
