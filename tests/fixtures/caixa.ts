import type {
  Saldo,
  Matriz,
  Movimentos,
  Extrato,
  Pedido,
  Recibo,
  Vinculo,
} from '../../src/features/caixa/protocol';
import { conta } from './contas';
export const caixaSaldo: Saldo = {
  data_corte: null,
  contas: [
    {
      conta_casa_id: 11,
      casa_id: 7,
      banca_id: 1,
      apelido: 'Principal',
      saldo_atual_centavos: 48200,
      saldo_confiavel: true,
      depositado_centavos: 50000,
      sacado_centavos: 0,
      bonus_centavos: 0,
      movido_centavos: 0,
      apostado_centavos: 12000,
      retornado_centavos: 10200,
      em_jogo_centavos: 2000,
      apostas_pendentes: 2,
      movimentos: 1,
      desde: '2026-01-01T12:00:00Z',
      deposito_faltante_centavos: 0,
    },
    {
      conta_casa_id: 12,
      casa_id: 7,
      banca_id: null,
      apelido: 'Reserva',
      saldo_atual_centavos: null,
      saldo_confiavel: false,
      depositado_centavos: 0,
      sacado_centavos: 0,
      bonus_centavos: 0,
      movido_centavos: 0,
      apostado_centavos: 3500,
      retornado_centavos: 4200,
      em_jogo_centavos: 1000,
      apostas_pendentes: 1,
      movimentos: 0,
      desde: null,
      deposito_faltante_centavos: 3500,
    },
  ],
  saldo_conhecido_centavos: 48200,
  saldo_total_centavos: null,
  saldo_total_escopo: 'contas_casa',
  contas_sem_saldo_confiavel: 1,
  bancas: [
    {
      id: 1,
      nome: 'Banca principal',
      saldo_inicial_centavos: 50000,
      saldo_total_centavos: 48200,
      motivo_saldo_indisponivel: null,
    },
    {
      id: 2,
      nome: 'Banca de reserva',
      saldo_inicial_centavos: null,
      saldo_total_centavos: null,
      motivo_saldo_indisponivel: 'sem contas',
    },
  ],
};
export const caixaMatriz: Matriz = {
  casa_id: 7,
  casa_nome: 'Betano',
  contas: [
    { ...conta, apelido: 'Principal' },
    {
      ...conta,
      conta_casa_id: 12,
      titular_id: null,
      titular_nome: null,
      apelido: 'Reserva',
    },
  ],
  titulares_sem_conta: [],
  proxima_acao_sem_conta: 'CRIAR_CONTA',
};
export const caixaMovimentos: Movimentos = {
  data: [
    {
      id: 1,
      conta_casa_id: 11,
      tipo: 'DEPOSITO',
      valor_centavos: 50000,
      transferencia_id: null,
      ocorrido_em: '2026-10-10T15:00:00Z',
      descricao: 'Entrada inicial',
    },
    {
      id: 2,
      conta_casa_id: 12,
      tipo: 'BONUS',
      valor_centavos: 1000,
      transferencia_id: null,
      ocorrido_em: '2026-10-11T15:00:00Z',
      descricao: 'Bônus recebido',
    },
  ],
  pagination: { page: 1, page_size: 20, total: 2 },
};
export const caixaExtrato: Extrato = {
  data: [
    {
      ...caixaMovimentos.data[0]!,
      origem: 'movimento',
      data_referencia: '2026-10-10T15:00:00Z',
    },
    {
      origem: 'aposta',
      id: 7,
      chave: 'demo',
      tipo: 'APOSTA_LIQUIDADA',
      conta_casa_id: 11,
      estado: 'GREEN',
      stake_centavos: 0,
      retorno_centavos: 1200,
      resultado_liquido_centavos: 1200,
      revisao_grave: false,
      data_referencia: '2026-10-12T15:00:00Z',
      data_referencia_origem: 'data_aposta',
      liquidada_em: null,
    },
  ],
  pagination: { page: 1, page_size: 20, total: 2 },
};
export function caixaFixture() {
  const saldo = structuredClone(caixaSaldo),
    moves = structuredClone(caixaMovimentos),
    feed = structuredClone(caixaExtrato);
  const receipts = new Map<string, { body: string; data: Recibo }>();
  function handle(method: string, url: URL, input?: unknown, key?: string) {
    const page = Number(url.searchParams.get('page') ?? 1),
      pageSize = Number(url.searchParams.get('page_size') ?? 20);
    if (url.pathname.endsWith('/matriz'))
      return { data: caixaMatriz, status: 200 };
    if (method === 'GET' && url.pathname === '/api/v1/caixa/saldo')
      return {
        data: { ...saldo, data_corte: url.searchParams.get('data_corte') },
        status: 200,
      };
    if (
      method === 'GET' &&
      (url.pathname === '/api/v1/caixa' ||
        url.pathname === '/api/v1/caixa/extrato')
    ) {
      const list = url.pathname.endsWith('/extrato') ? feed.data : moves.data;
      const selected = list.filter(
        (row) =>
          (!url.searchParams.has('conta_casa_id') ||
            String(row.conta_casa_id) ===
              url.searchParams.get('conta_casa_id')) &&
          (!url.searchParams.has('tipo') ||
            row.tipo === url.searchParams.get('tipo')),
      );
      return {
        data: {
          data: selected.slice((page - 1) * pageSize, page * pageSize),
          pagination: { page, page_size: pageSize, total: selected.length },
        },
        status: 200,
      };
    }
    if (method === 'POST' && url.pathname === '/api/v1/caixa') {
      const body = input as Pedido,
        fingerprint = JSON.stringify(input);
      const old = receipts.get(key!);
      if (old)
        return old.body === fingerprint
          ? { data: old.data, status: 201 }
          : { data: { detail: 'conflict' }, status: 409 };
      const transfer =
        body.tipo === 'TRANSFERENCIA' ? crypto.randomUUID() : null;
      const id = moves.data.length + 1;
      const source = {
        id,
        conta_casa_id: body.conta_casa_id ?? null,
        tipo: body.tipo,
        valor_centavos:
          body.tipo === 'SAQUE' || transfer
            ? -body.valor_centavos
            : body.valor_centavos,
        transferencia_id: transfer,
        ocorrido_em: body.ocorrido_em,
        descricao: body.descricao ?? null,
      };
      const items = transfer
        ? [
            source,
            {
              ...source,
              id: id + 1,
              conta_casa_id: body.conta_casa_destino_id!,
              valor_centavos: body.valor_centavos,
            },
          ]
        : [source];
      const data: Recibo = {
        tipo: body.tipo,
        transferencia_id: transfer,
        movimentos: items,
      };
      moves.data.push(...items);
      feed.data.push(
        ...items.map((move) => ({
          ...move,
          origem: 'movimento' as const,
          data_referencia: move.ocorrido_em,
        })),
      );
      receipts.set(key!, { body: fingerprint, data });
      return { data, status: 201 };
    }
    if (method === 'PATCH') {
      const id = Number(url.pathname.split('/').at(-2));
      const account = saldo.contas.find((c) => c.conta_casa_id === id);
      if (!account) return { data: { detail: 'missing' }, status: 404 };
      account.banca_id = (input as { banca_id: number | null }).banca_id;
      const data: Vinculo = { conta_casa_id: id, banca_id: account.banca_id };
      return { data, status: 200 };
    }
    return { data: { detail: 'missing' }, status: 404 };
  }
  return { handle, receipts, saldo, moves };
}
