import { useEffect, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getApiClient } from '../../api/client';
import { ApiError } from '../../api/error';
import { recuperacaoErro } from '../../api/recovery';
import { useAuth } from '../../auth/ProvedorAuth';
import { MAX_AUTOMATIC_WAIT_MS } from '../../app/queryClient';
import type { components } from '../../api/schema';
import type { Dimensao, VisaoFiltros } from '../../lib/params';
import type { CatalogosFiltros } from './Filtros';

export const CATALOGOS = {
  casa: 'casas',
  tipster: 'tipsters',
  mercado: 'mercados',
  competicao: 'competicoes',
  titular: 'titulares',
  conta: 'contas',
  grupo: 'grupos',
  banca: 'bancas',
  origem: 'origens',
} as const satisfies Record<
  Dimensao | 'origem',
  components['schemas']['OpcoesFiltro']['dimensao']
>;
type Campo = keyof typeof CATALOGOS;
type Busca = Readonly<{ q: string; page: number }>;
async function consultarCatalogo(
  client: ReturnType<typeof getApiClient>,
  auth: NonNullable<ReturnType<typeof useAuth>>,
  campo: Campo,
  query: { q?: string; page?: number; id?: string },
  signal: AbortSignal,
  bloqueadoAte: number,
  esperar: (deadline: number) => void,
) {
  const remaining = bloqueadoAte - Date.now();
  if (remaining > 0)
    throw new ApiError('http', {
      status: 429,
      headers: new Headers({
        'Retry-After': String(Math.ceil(remaining / 1000)),
      }),
    });
  try {
    return await auth.service.read(async () => {
      const { data } = await client.GET('/api/v1/filtros/{dimensao}', {
        params: {
          path: { dimensao: CATALOGOS[campo] },
          query: { ...query, page_size: 50 },
        },
        signal,
      });
      if (!data || data.dimensao !== CATALOGOS[campo])
        throw new ApiError('invalid_response');
      return data;
    });
  } catch (error) {
    if (error instanceof ApiError && error.retryAfterMs)
      esperar(Date.now() + error.retryAfterMs);
    throw error;
  }
}

export function useCatalogosFiltros(
  visao: VisaoFiltros,
  client = getApiClient(),
) {
  const auth = useAuth();
  const [buscas, setBuscas] = useState<Partial<Record<Campo, Busca>>>({});
  const [bloqueadoAte, setBloqueadoAte] = useState(0);
  const [expiradoAte, setExpiradoAte] = useState(0);
  const waiting = bloqueadoAte > expiradoAte;
  const campos = Object.keys(CATALOGOS) as Campo[];
  const scope = [auth?.state.person?.id, auth?.state.privateEpoch];
  const enabled = auth?.state.phase === 'authenticated';
  const habilitar = (query: { state: { error: unknown } }) =>
    enabled &&
    !(
      query.state.error instanceof ApiError &&
      (query.state.error.retryAfterMs ?? 0) > MAX_AUTOMATIC_WAIT_MS
    );
  const consultar = async (
    campo: Campo,
    query: { q?: string; page?: number; id?: string },
    signal: AbortSignal,
  ) => {
    if (!auth) throw new ApiError('invalid_request');
    return consultarCatalogo(
      client,
      auth,
      campo,
      query,
      signal,
      bloqueadoAte,
      (deadline) => setBloqueadoAte((current) => Math.max(current, deadline)),
    );
  };
  const listas = useQueries({
    queries: campos.map((campo) => {
      const query = buscas[campo] ?? { q: '', page: 1 };
      return {
        queryKey: ['filtros', ...scope, campo, query],
        enabled: habilitar,
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          consultar(
            campo,
            { page: query.page, q: query.q || undefined },
            signal,
          ),
      };
    }),
  });
  const selecionados = useQueries({
    queries: campos.map((campo) => ({
      queryKey: ['filtro-selecionado', ...scope, campo, visao.valores[campo]],
      enabled: (query: { state: { error: unknown } }) =>
        habilitar(query) && !!visao.valores[campo],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        consultar(campo, { id: visao.valores[campo] }, signal),
    })),
  });
  useEffect(() => {
    if (!bloqueadoAte) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const remaining = bloqueadoAte - Date.now();
      if (remaining > 0) timer = setTimeout(tick, Math.min(1000, remaining));
      else setExpiradoAte(bloqueadoAte);
    };
    timer = setTimeout(
      tick,
      Math.max(0, Math.min(1000, bloqueadoAte - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [bloqueadoAte]);
  const catalogos: CatalogosFiltros = Object.fromEntries(
    campos.map((campo, index) => {
      const lista = listas[index]!;
      const selecionado = selecionados[index]!;
      const query = buscas[campo] ?? { q: '', page: 1 };
      const data = lista.data;
      const options = (data?.data ?? []).map((option) => ({
        value: option.id,
        label: option.nome + (option.ativa ? '' : ' (inativa)'),
      }));
      const escolhido = selecionado.data?.data.find(
        (option) => option.id === visao.valores[campo],
      );
      const erro = lista.isError
        ? recuperacaoErro(lista.error, 'leitura')
        : undefined;
      return [
        campo,
        {
          fase: lista.isError
            ? 'erro'
            : lista.isPending
              ? 'carregando'
              : 'pronto',
          options,
          selecionada: escolhido
            ? {
                value: escolhido.id,
                label: escolhido.nome + (escolhido.ativa ? '' : ' (inativa)'),
              }
            : undefined,
          erro: erro ? `${erro.title}. ${erro.description}` : undefined,
          selecionadaErro: selecionado.isError
            ? 'Não foi possível consultar o nome do filtro salvo. Seu identificador foi preservado.'
            : undefined,
          tentarSelecionada:
            selecionado.isError && !waiting
              ? () => {
                  void selecionado.refetch();
                }
              : undefined,
          tentar: !waiting
            ? () => {
                void lista.refetch();
              }
            : undefined,
          consulta: query.q,
          buscar: (q: string) =>
            setBuscas((current) => ({ ...current, [campo]: { q, page: 1 } })),
          pagina: query.page,
          anterior:
            query.page > 1 && !lista.isFetching && !waiting
              ? () =>
                  setBuscas((current) => ({
                    ...current,
                    [campo]: { ...query, page: query.page - 1 },
                  }))
              : undefined,
          proxima:
            data &&
            query.page * data.pagination.page_size < data.pagination.total &&
            !lista.isFetching &&
            !waiting
              ? () =>
                  setBuscas((current) => ({
                    ...current,
                    [campo]: { ...query, page: query.page + 1 },
                  }))
              : undefined,
          atualizando: lista.isFetching || waiting,
        },
      ];
    }),
  );
  return catalogos;
}
