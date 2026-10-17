import type {
  ApostaResultado,
  Fila,
  Pedido,
  Recibo,
  Reversao,
} from '../../src/features/resultados/protocol';
export const revisaoExemplo = 'f3caee8d-56b9-4dc0-b114-9b1b60852c13';
export const apostaResultado = (
  overrides: Partial<ApostaResultado> = {},
): ApostaResultado => ({
  chave: 'resultado-1',
  revisao: revisaoExemplo,
  estado: 'PENDENTE',
  elegivel: true,
  motivo_inelegivel: null,
  antiguidade: '2026-10-10T18:00:00Z',
  criterio_antiguidade: 'data_jogo',
  origem: 'manual',
  casa: 'Betano',
  evento: 'Botafogo × Fluminense',
  descricao: 'Mais de 2,5 gols',
  mercado: 'Total de gols',
  data_jogo: '2026-10-10T18:00:00Z',
  data_aposta: '2026-10-09T12:00:00Z',
  odd: 1.9,
  stake_unidades: 1,
  stake_centavos: 1000,
  valor_aposta_centavos: 1000,
  retorno_centavos: null,
  retorno_informado: null,
  comissao_centavos: null,
  lucro_centavos: null,
  freebet: false,
  conta_atribuicao: 'ASSIGNED',
  conta_contexto: { apelido: 'Conta principal', titular: { nome: 'Ana' } },
  banca_contexto: null,
  tipster_id: null,
  mercado_id: null,
  competicao_id: null,
  ...overrides,
});
export const filaResultado = (
  data: ApostaResultado[] = [apostaResultado()],
  overrides: Partial<Fila> = {},
): Fila => ({
  data,
  next_cursor: null,
  total_elegivel: data.length,
  observado_em: '2026-10-13T12:00:00Z',
  fronteira_iniciada_em: '2026-10-13T12:00:00Z',
  frescor: 'primary_snapshot',
  populacao: 'pending_selected_financial_assigned_without_severe_review',
  ...overrides,
});
export const reciboResultado = (
  id: string,
  item = apostaResultado(),
  overrides: Partial<Recibo> = {},
): Recibo => ({
  id,
  tipo: 'result',
  aposta: {
    ...item,
    estado: 'GREEN',
    elegivel: false,
    motivo_inelegivel: 'already_settled',
    revisao: crypto.randomUUID(),
    retorno_centavos: 1900,
    lucro_centavos: 900,
  },
  operacao_desfeita: null,
  confirmado_em: '2026-10-13T12:00:00Z',
  desfazer_ate: '2026-10-14T12:00:00Z',
  consultar_ate: '2027-01-11T12:00:00Z',
  eventos_gravados: 1,
  ...overrides,
});
// Fixture server only. The real API is proved independently in tests/identity.
export function resultadosFixture() {
  const events = [
    'Botafogo × Fluminense',
    'Corinthians × Santos',
    'Flamengo × Palmeiras',
    'Grêmio × Internacional',
    'Bahia × Vitória',
    'Cruzeiro × Atlético-MG',
  ];
  const items = Array.from({ length: 26 }, (_, index) =>
    apostaResultado({
      chave: `resultado-${index + 1}`,
      evento:
        events[index % events.length]! +
        (index > 5 ? ` · aposta ${index + 1}` : ''),
      descricao: index % 2 ? 'Vitória do mandante' : 'Mais de 2,5 gols',
    }),
  );
  const receipts = new Map<string, Recibo>();
  const before = new Map<string, ApostaResultado>();
  const requests = new Map<string, string>();
  function handle(
    method: string,
    path: string,
    query = new URLSearchParams(),
    body?: Pedido | Reversao,
  ) {
    const fail = (code: string, status = 409) => ({
      status,
      data: { detail: { code } },
    });
    if (path.endsWith('/fila')) {
      const after = Number(query.get('cursor')?.replace('fixture-', '') ?? 0);
      const eligible = items.filter((item) => item.elegivel);
      const page = items
        .slice(after)
        .filter((item) => item.elegivel)
        .slice(0, 6);
      const last = page.at(-1);
      const position = last ? items.indexOf(last) + 1 : items.length;
      return {
        status: 200,
        data: filaResultado(page, {
          total_elegivel: eligible.length,
          next_cursor: items.slice(position).some((item) => item.elegivel)
            ? `fixture-${position}`
            : null,
        }),
      };
    }
    if (path.includes('/apostas/')) {
      const item = items.find(
        (item) => item.chave === decodeURIComponent(path.split('/').at(-1)!),
      );
      return item ? { status: 200, data: item } : fail('result_not_found', 404);
    }
    const undo = path.endsWith('/desfazer');
    const id = path.split('/').at(undo ? -2 : -1)!;
    if (method === 'GET')
      return receipts.has(id)
        ? { status: 200, data: receipts.get(id) }
        : fail('result_intention_not_found', 404);
    if (!body) return fail('result_invalid', 422);
    if (receipts.has(id))
      return requests.get(id) === JSON.stringify(body)
        ? { status: 200, data: receipts.get(id) }
        : fail('result_intention_conflict');
    const target = undo
      ? receipts.get((body as Reversao).operacao_id)
      : undefined;
    const item = items.find(
      (item) =>
        item.chave === (undo ? target?.aposta.chave : (body as Pedido).chave),
    );
    if (!item) return fail('result_not_found', 404);
    if (item.revisao !== body.revisao_esperada)
      return fail('result_revision_conflict');
    let receipt: Recibo;
    if (undo && target) {
      const original = before.get(target.id)!;
      Object.assign(item, original, { revisao: crypto.randomUUID() });
      receipt = reciboResultado(id, item, {
        tipo: 'undo',
        aposta: { ...item },
        operacao_desfeita: target.id,
        desfazer_ate: null,
      });
    } else {
      before.set(id, { ...item });
      const request = body as Pedido;
      receipt = reciboResultado(id, item);
      receipt.aposta.estado = request.estado;
      if (request.estado === 'ANULADA') {
        receipt.aposta.retorno_centavos = 1000;
        receipt.aposta.lucro_centavos = 0;
      }
      if (request.estado === 'MEIO_GREEN') {
        receipt.aposta.retorno_centavos = 1450;
        receipt.aposta.lucro_centavos = 450;
      }
      if (request.estado === 'MEIO_RED') {
        receipt.aposta.retorno_centavos = 500;
        receipt.aposta.lucro_centavos = -500;
      }
      if (request.estado === 'RED') {
        receipt.aposta.retorno_centavos = 0;
        receipt.aposta.lucro_centavos = -1000;
      }
      if (request.estado === 'CASHOUT') {
        receipt.aposta.retorno_centavos = request.cashout_valor_centavos!;
        receipt.aposta.lucro_centavos = null;
      }
      Object.assign(item, receipt.aposta);
    }
    requests.set(id, JSON.stringify(body));
    receipts.set(id, receipt);
    return { status: 200, data: receipt };
  }
  return { items, handle, receipts };
}
