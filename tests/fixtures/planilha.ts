import type { components } from '../../src/api/schema';
import type {
  Source,
  Catalog,
  Preview,
  Rows,
  Result,
} from '../../src/features/importar/protocol';

export const sourceId = '10371ed5-9aec-4d2a-8d53-30a2cd673413';
export const previewId = '3b6c8d2b-3c96-46e3-a4f1-2b31d835e063';
export const confirmationId = '94395a5e-87f0-480b-b297-0e40b41b2379';
export const source = (overrides: Partial<Source> = {}): Source => ({
  id: sourceId,
  nome: 'Apostas pessoais',
  origem_id: `web-xlsx:${sourceId}`,
  version: 1,
  current_preview: null,
  ...overrides,
});
export const fields: Catalog = {
  formats: ['xlsx'],
  daily_previews: 20,
  max_bytes: 5000000,
  max_rows: 1000,
  max_sheets: 10,
  max_columns: 64,
  max_cells: 64000,
  max_cell_characters: 1000,
  max_expansion_ratio: 100,
  max_inflated_bytes: 20971520,
  max_parse_seconds: 10,
  max_operation_seconds: 30,
  fields: [
    {
      field: 'linha_id',
      label: 'Identificador da linha',
      type: 'text',
      required: true,
      options: [],
    },
    { field: 'casa', label: 'Casa', type: 'text', required: true, options: [] },
    {
      field: 'data_aposta',
      label: 'Data da aposta',
      type: 'date-time',
      required: true,
      options: [],
    },
    {
      field: 'odd',
      label: 'Odd',
      type: 'decimal',
      required: true,
      options: [],
    },
    {
      field: 'stake_unidades',
      label: 'Stake em unidades',
      type: 'decimal',
      required: true,
      options: [],
    },
    {
      field: 'atualizada_em',
      label: 'Atualizada em',
      type: 'date-time',
      required: true,
      options: [],
    },
    {
      field: 'freebet',
      label: 'Freebet',
      type: 'boolean',
      required: false,
      options: [],
    },
    {
      field: 'conta_casa_ref',
      label: 'Conta da casa',
      type: 'account-id',
      required: false,
      options: [],
    },
  ],
};
export const preview = (overrides: Partial<Preview> = {}): Preview => ({
  id: previewId,
  source_id: sourceId,
  origem_id: `web-xlsx:${sourceId}`,
  revision: 1,
  source_version: 1,
  preview_hash: 'a'.repeat(64),
  file_hash: 'b'.repeat(64),
  state: 'ready',
  sheet: 'Apostas',
  sheets: [
    {
      name: 'Apostas',
      headers: fields.fields.map((f) => f.field),
      total_rows: 3,
    },
    { name: 'Outra aba', headers: ['linha_id', 'casa'], total_rows: 1 },
  ],
  mapping: {
    linha_id: 1,
    casa: 2,
    data_aposta: 3,
    odd: 4,
    stake_unidades: 5,
    atualizada_em: 6,
    freebet: 7,
  },
  mapping_errors: [],
  total_rows: 3,
  counts: {
    criadas: 1,
    atualizadas: 1,
    ignoradas: 1,
    recusadas: 0,
    revisoes: 1,
  },
  expires_at: '2030-01-02T00:00:00Z',
  ...overrides,
});
export const rows = (overrides: Partial<Rows> = {}): Rows => ({
  page: 1,
  page_size: 20,
  total: 3,
  data: [
    {
      sheet: 'Apostas',
      number: 2,
      linha_id: 'MINHA-01',
      raw: [
        'MINHA-01',
        'Betano',
        '2026-10-12T12:00:00-03:00',
        2,
        1,
        '2026-10-12T14:00:00-03:00',
        false,
      ],
      normalized: {},
      errors: [],
      consequence: 'create',
      bet_key: null,
      review_reason: null,
      stake_centavos: 2000,
      valor_aposta_centavos: 2000,
      conta_casa_id: null,
    },
    {
      sheet: 'Apostas',
      number: 3,
      linha_id: 'MINHA-02',
      raw: [
        'MINHA-02',
        'Betano',
        '2026-10-12T12:00:00-03:00',
        1.9,
        2,
        '2026-10-12T14:00:00-03:00',
        true,
      ],
      normalized: {},
      errors: [],
      consequence: 'update',
      bet_key: 'demo',
      review_reason: 'missing',
      stake_centavos: 0,
      valor_aposta_centavos: 4000,
      conta_casa_id: 7,
    },
    {
      sheet: 'Apostas',
      number: 4,
      linha_id: 'MINHA-03',
      raw: ['MINHA-03', 'Betano'],
      normalized: {},
      errors: [],
      consequence: 'ignore',
      bet_key: 'demo',
      review_reason: null,
      stake_centavos: null,
      valor_aposta_centavos: null,
      conta_casa_id: null,
    },
  ],
  ...overrides,
});
export const result = (overrides: Partial<Result> = {}): Result => ({
  id: confirmationId,
  source_id: sourceId,
  preview_id: previewId,
  source_version: 2,
  state: 'completed',
  atomic: true,
  counts: {
    criadas: 1,
    atualizadas: 1,
    ignoradas: 1,
    recusadas: 0,
    revisoes: 1,
  },
  aggregate_freshness: 'materialized_views_eventual',
  expires_at: '2030-04-01T00:00:00Z',
  rows: [
    {
      linha_id: 'MINHA-01',
      sheet: 'Apostas',
      number: 2,
      outcome: 'created',
      bet_key: 'demo',
      review_ids: [],
    },
    {
      linha_id: 'MINHA-02',
      sheet: 'Apostas',
      number: 3,
      outcome: 'updated',
      bet_key: 'demo',
      review_ids: [1],
    },
    {
      linha_id: 'MINHA-03',
      sheet: 'Apostas',
      number: 4,
      outcome: 'ignored',
      bet_key: 'demo',
      review_ids: [],
    },
  ],
  ...overrides,
});

// Test-only state machine. It never parses XLSX or models production decisions.
export function sheetFixture() {
  const sources = new Map<string, Source>();
  sources.set(sourceId, source());
  const previews = new Map<string, Preview>();
  previews.set(previewId, preview());
  const confirmations = new Map<string, Result>();
  return {
    sources,
    previews,
    confirmations,
    handle(
      method: string,
      path: string,
      query: URLSearchParams,
      body?: unknown,
    ): { data: unknown; status: number } {
      const missing = { data: { detail: 'not_found' }, status: 404 };
      if (path === '/api/v1/planilhas/campos')
        return { data: fields, status: 200 };
      if (path === '/api/v1/planilhas/fontes')
        return {
          data: {
            data: [...sources.values()],
            total: sources.size,
            page: Number(query.get('page') ?? 1),
            page_size: 20,
          },
          status: 200,
        };
      const parts = path.split('/');
      const id = parts[5]!;
      if (parts[4] === 'fontes' && parts.length === 6) {
        if (method === 'PUT') {
          const nome = (body as components['schemas']['SourceInput']).nome;
          const data = source({ id, nome, origem_id: `web-xlsx:${id}` });
          sources.set(id, data);
          return { data, status: 200 };
        }
        return sources.has(id)
          ? { data: sources.get(id), status: 200 }
          : missing;
      }
      if (parts[4] === 'fontes' && method === 'POST') {
        const pid = parts[7]!;
        const data = preview({
          id: pid,
          source_id: id,
          origem_id: `web-xlsx:${id}`,
        });
        previews.set(pid, data);
        return { data, status: 201 };
      }
      if (parts[4] === 'previas') {
        if (parts[6] === 'remapear') {
          const input = body as components['schemas']['RemapInput'];
          const pid = parts[7]!;
          const data = preview({
            id: pid,
            sheet: input.sheet,
            mapping: input.mapping,
            revision: 2,
            preview_hash: 'c'.repeat(64),
          });
          previews.set(pid, data);
          return { data, status: 201 };
        }
        if (parts[6] === 'linhas')
          return {
            data: rows({
              page: Number(query.get('page') ?? 1),
              total: previews.get(id)?.total_rows ?? 3,
            }),
            status: 200,
          };
        return previews.has(id)
          ? { data: previews.get(id), status: 200 }
          : missing;
      }
      if (parts[4] === 'confirmacoes') {
        if (method === 'POST') {
          const input = body as components['schemas']['ConfirmInput'];
          const data = result({
            id,
            preview_id: input.preview_id,
            source_id: previews.get(input.preview_id)?.source_id ?? sourceId,
          });
          confirmations.set(id, data);
          return { data, status: 200 };
        }
        return confirmations.has(id)
          ? { data: confirmations.get(id), status: 200 }
          : missing;
      }
      return missing;
    },
  };
}
