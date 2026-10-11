import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/ProvedorAuth';
import type { createApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { ErroApi } from '../../components/ErroApi';
import type { useLeituraPainel } from './useLeituraPainel';
import { serializarConsulta } from '../../lib/params';
import { EXPORT } from './protocol';
export function ExportarPainel({
  client,
  query,
  leitura,
}: {
  client: ReturnType<typeof createApiClient>;
  query: Record<string, string | boolean>;
  leitura: ReturnType<typeof useLeituraPainel>;
}) {
  const auth = useAuth()!;
  const resource = useRef<{ controller?: AbortController; url?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [done, setDone] = useState(false);
  const waiting = leitura.waiting;
  useEffect(() => {
    const clear = () => {
      resource.current.controller?.abort();
      if (resource.current.url) URL.revokeObjectURL(resource.current.url);
      resource.current = {};
    };
    const unregister = auth.service.registerCleanup(clear);
    return () => {
      clear();
      unregister();
    };
  }, [auth.service]);
  const exportar = async () => {
    if (resource.current.controller || waiting) return;
    const controller = new AbortController();
    resource.current.controller = controller;
    setBusy(true);
    setError(undefined);
    setDone(false);
    try {
      const blob = await leitura.read(async () => {
        const result = await client.GET(EXPORT, {
          signal: controller.signal,
          params: { query: {} },
          querySerializer: () => serializarConsulta(query),
          parseAs: 'blob',
        });
        const blob = result.data;
        if (
          !(blob instanceof Blob) ||
          !blob.type.includes('spreadsheetml.sheet')
        )
          throw new ApiError('invalid_response');
        return blob;
      });
      if (controller.signal.aborted) throw new ApiError('cancelled');
      const url = URL.createObjectURL(blob);
      resource.current.url = url;
      const link = document.createElement('a');
      link.href = url;
      link.download = 'painel.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      resource.current.url = undefined;
      if (!controller.signal.aborted) setDone(true);
    } catch (e) {
      if (!controller.signal.aborted) setError(e);
    } finally {
      if (!controller.signal.aborted) {
        resource.current.controller = undefined;
        setBusy(false);
      }
    }
  };
  return (
    <div className="painel-export">
      <button disabled={busy || waiting} onClick={() => void exportar()}>
        {busy ? 'Preparando Excel…' : 'Exportar Painel em Excel'}
      </button>
      {done && (
        <p role="status">
          Excel pronto para baixar. Inclui todos os dias e tipsters deste
          recorte.
        </p>
      )}
      {!!error && (
        <ErroApi
          contexto="Excel do Painel"
          error={error}
          intent="leitura"
          destination="/painel"
          actions={{ tentar: () => void exportar() }}
        />
      )}
    </div>
  );
}
