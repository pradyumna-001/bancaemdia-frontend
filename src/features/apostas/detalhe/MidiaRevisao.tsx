import { useEffect, useRef, useState } from 'react';
import type { createApiClient } from '../../../api/client';
import { ApiError } from '../../../api/error';
import { recuperacaoErro } from '../../../api/recovery';
import { useAuth } from '../../../auth/ProvedorAuth';
import { ErroApi } from '../../../components/ErroApi';
import { useRetryAfter } from '../../../lib/useRetryAfter';

export function MidiaRevisao({
  id,
  api,
}: {
  id: number;
  api: ReturnType<typeof createApiClient>;
}) {
  const auth = useAuth();
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  const control = useRef<AbortController>();
  const resource = useRef<string>();
  const alive = useRef(true);
  const waiting = useRetryAfter(error);
  useEffect(() => {
    alive.current = true;
    const clear = () => {
      control.current?.abort();
      if (resource.current) URL.revokeObjectURL(resource.current);
      resource.current = undefined;
      if (alive.current) {
        setUrl(undefined);
        setError(undefined);
        setBusy(false);
      }
    };
    const unregister = auth?.service.registerCleanup(clear);
    return () => {
      alive.current = false;
      clear();
      unregister?.();
    };
  }, [auth?.service]);
  async function load() {
    if (
      !auth ||
      auth.state.phase !== 'authenticated' ||
      busy ||
      waiting ||
      url ||
      (error && recuperacaoErro(error, 'leitura').action !== 'tentar')
    )
      return;
    const scope = auth.service.capture();
    control.current = new AbortController();
    setBusy(true);
    setError(undefined);
    try {
      const result = await auth.service.read(() =>
        api.GET('/api/v1/revisao/{revisao_id}/foto', {
          params: { path: { revisao_id: id } },
          parseAs: 'blob',
          signal: control.current!.signal,
        }),
      );
      const blob = result.data;
      if (
        !(blob instanceof Blob) ||
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
          blob.type,
        ) ||
        !blob.size
      )
        throw new ApiError('invalid_response');
      if (!alive.current || !scope.isCurrent()) return;
      const next = URL.createObjectURL(blob);
      resource.current = next;
      setUrl(next);
    } catch (failure) {
      if (alive.current && scope.isCurrent()) setError(failure);
    } finally {
      if (alive.current && scope.isCurrent()) setBusy(false);
    }
  }
  return (
    <div className="aposta-midia">
      <div className="aposta-midia-espaco">
        {url && !broken ? (
          <img
            src={url}
            alt="Evidência da revisão desta aposta"
            loading="lazy"
            width="800"
            height="600"
            onError={() => setBroken(true)}
          />
        ) : (
          <p>
            {broken
              ? 'Não foi possível exibir esta imagem.'
              : 'Foto privada da revisão. Abra para consultar a evidência.'}
          </p>
        )}
      </div>
      {!url && (
        <button
          type="button"
          disabled={
            busy ||
            waiting ||
            (!!error && recuperacaoErro(error, 'leitura').action !== 'tentar')
          }
          onClick={() => void load()}
        >
          {busy ? 'Abrindo foto…' : 'Abrir foto da revisão'}
        </button>
      )}
      {!!error && (
        <ErroApi
          error={error}
          intent="leitura"
          actions={{ tentar: () => void load() }}
        />
      )}
    </div>
  );
}
