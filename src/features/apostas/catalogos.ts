import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { createApiClient } from '../../api/client';
import {
  objeto,
  respostaPublicada,
  type ContratoLeitura,
} from '../../api/readContract';
import { useAuth } from '../../auth/ProvedorAuth';
import type { CatalogosFiltros } from '../../components/filtros/Filtros';
import { serializarConsulta, type VisaoFiltros } from '../../lib/params';
import { useRetryAfter } from '../../lib/useRetryAfter';
import { ApiError } from '../../api/error';
import { recuperacaoErro } from '../../api/recovery';

const DIMENSOES_API = {
  casa: 'casas',
  tipster: 'tipsters',
  mercado: 'mercados',
  competicao: 'competicoes',
  titular: 'titulares',
  conta: 'contas',
  grupo: 'grupos',
  banca: 'bancas',
  origem: 'origens',
} as const;
const keys = Object.keys(DIMENSOES_API) as Array<keyof typeof DIMENSOES_API>;
const endpoint = '/api/v1/filtros/{dimensao}';

export function opcoesApresentacao(
  value: unknown,
  contrato: ContratoLeitura,
  dimensao: string,
) {
  const root = respostaPublicada(value, contrato[endpoint]?.response);
  if (root.dimensao !== dimensao) throw new ApiError('invalid_response');
  if (!Array.isArray(root.data)) throw new ApiError('invalid_response');
  const pagination = objeto(root.pagination);
  const numbers = ['page', 'page_size', 'total'].map((key) => pagination[key]);
  if (
    numbers.some(
      (v) => typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0,
    ) ||
    !numbers[0] ||
    !numbers[1]
  )
    throw new ApiError('invalid_response');
  return {
    options: root.data.map((entry) => {
      const item = objeto(entry);
      if (
        typeof item.id !== 'string' ||
        typeof item.nome !== 'string' ||
        typeof item.ativa !== 'boolean'
      )
        throw new ApiError('invalid_response');
      return {
        value: item.id,
        label: item.nome + (item.ativa ? '' : ' (inativa)'),
      };
    }),
    pagina: numbers[0] as number,
    temMais:
      (numbers[0] as number) * (numbers[1] as number) < (numbers[2] as number),
  };
}

export function useCatalogos(
  contrato: ContratoLeitura,
  client: ReturnType<typeof createApiClient>,
  visao: VisaoFiltros,
): CatalogosFiltros {
  const auth = useAuth();
  const [embargo, setEmbargo] = useState<{
    deadline: number;
    error?: ApiError;
  }>({
    deadline: 0,
  });
  const [searches, setSearches] = useState<
    Record<string, { q: string; page: number }>
  >({});
  const enabled = !!contrato[endpoint] && auth?.state.phase === 'authenticated';
  const current = keys.map((key) => searches[key] ?? { q: '', page: 1 });
  const queries = useQueries({
    queries: keys.flatMap((key, index) =>
      [false, true].map((selected) => {
        const search = current[index]!;
        const id = selected ? visao.valores[key] : undefined;
        const query: Record<string, string | number | boolean> = selected
          ? { id: id! }
          : { q: search.q, page: search.page, page_size: 20 };
        return {
          queryKey: [
            'catalogos-apostas',
            auth?.state.privateEpoch,
            auth?.state.person?.id,
            key,
            selected,
            query,
          ],
          enabled: enabled && (!selected || !!id),
          retryOnMount: false,
          queryFn: async ({ signal }: { signal: AbortSignal }) => {
            if (embargo.deadline > Date.now()) throw new ApiError('cancelled');
            try {
              return await auth!.service.read(async () => {
                // The path and its validator must exist in the same generated contract.
                const response = await client.GET(
                  ('/api/v1/filtros/' +
                    DIMENSOES_API[key]) as '/api/v1/apostas',
                  {
                    signal,
                    params: { query: {} },
                    querySerializer: () => serializarConsulta(query),
                  },
                );
                return opcoesApresentacao(
                  response.data,
                  contrato,
                  DIMENSOES_API[key],
                );
              });
            } catch (error) {
              if (error instanceof ApiError && error.retryAfterMs) {
                const deadline = Date.now() + error.retryAfterMs;
                setEmbargo((old) =>
                  old.deadline >= deadline ? old : { deadline, error },
                );
              }
              throw error;
            }
          },
        };
      }),
    ),
  });
  // One Retry-After deadline per catalog group; no hidden retry on reopening a picker.
  const waiting = useRetryAfter(embargo.error);
  if (!enabled) return {};
  return Object.fromEntries(
    keys.map((key, index) => {
      const query = queries[index * 2]!;
      const selected = queries[index * 2 + 1]!;
      const search = current[index]!;
      const change = (value: { q: string; page: number }) => {
        if (!waiting) setSearches((old) => ({ ...old, [key]: value }));
      };
      return [
        key,
        {
          fase: query.isError ? 'erro' : query.data ? 'pronto' : 'carregando',
          options: query.data?.options ?? [],
          consulta: search.q,
          pagina: query.data?.pagina,
          atualizando: query.isFetching,
          buscar: waiting ? undefined : (q: string) => change({ q, page: 1 }),
          anterior:
            search.page > 1 && !query.isFetching && !waiting
              ? () => change({ ...search, page: search.page - 1 })
              : undefined,
          proxima:
            query.data?.temMais && !query.isFetching && !waiting
              ? () => change({ ...search, page: search.page + 1 })
              : undefined,
          tentar:
            !query.isFetching &&
            !waiting &&
            (!query.error ||
              recuperacaoErro(query.error, 'leitura').action === 'tentar')
              ? () => void query.refetch()
              : undefined,
          erro: query.isError
            ? (query.error instanceof ApiError
                ? query.error.message
                : 'Não foi possível carregar as opções.') +
              ' Seu filtro foi preservado.'
            : undefined,
          selecionada: selected.data?.options.find(
            (option) => option.value === visao.valores[key],
          ),
          selecionadaErro:
            visao.valores[key] && selected.isError
              ? 'Não foi possível consultar o nome. O identificador foi preservado.'
              : undefined,
          tentarSelecionada:
            selected.isError &&
            !selected.isFetching &&
            !waiting &&
            recuperacaoErro(selected.error, 'leitura').action === 'tentar'
              ? () => void selected.refetch()
              : undefined,
        },
      ];
    }),
  );
}
