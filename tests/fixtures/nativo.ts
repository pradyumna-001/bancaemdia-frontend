import type { components } from '../../src/api/schema';

type Conta = components['schemas']['NativeAccountResponse'];
type Aposta = components['schemas']['NativeBetResponse'];
type Resumo = components['schemas']['NativeSummaryResponse'];
type Nova = components['schemas']['NativeAccountCreate'];

// Synthetic test data only; shapes follow the pinned OpenAPI and
// docs/contracts/native-financials-115.md of the API (exact decimal text,
// totals per currency, combined total always null).
export function nativoFixture({
  contas = [
    {
      id: 31,
      casa_id: 7,
      currency: 'USDT' as const,
      label: '1win USDT',
      valid_from: '2026-10-01T03:00:00Z',
      valid_to: null,
      active: true,
    },
  ] as Conta[],
  apostas = [
    {
      id: 501,
      account_id: 31,
      currency: 'USDT' as const,
      state: 'GREEN' as const,
      stake: '10.5',
      returned: '19.845000000000000000000000000001',
      profit: '9.345000000000000000000000000001',
      game_at: '2026-10-10T18:00:00Z',
      placed_at: '2026-10-10T12:00:00Z',
      needs_review: false,
    },
    {
      id: 502,
      account_id: null,
      currency: 'USDT' as const,
      state: 'RED' as const,
      stake: '4',
      returned: '0',
      profit: '-4',
      game_at: '2026-10-11T18:00:00Z',
      placed_at: '2026-10-11T12:00:00Z',
      needs_review: true,
    },
  ] as Aposta[],
  resumo = {
    money_contract: 2,
    combined_monetary_total: null,
    totals_by_currency: [
      {
        currency: 'USDT',
        bets: 1,
        stake: '10.5',
        returned: '19.845000000000000000000000000001',
        profit: '9.345000000000000000000000000001',
      },
    ],
  } as Resumo,
} = {}) {
  let lista = structuredClone(contas);
  let proximo = 100;
  return {
    contas: () => lista,
    apostas: (limit = 20) => apostas.slice(0, limit),
    resumo: () => resumo,
    criar(body: Nova) {
      const conta: Conta = {
        id: proximo++,
        casa_id: body.casa_id,
        currency: body.currency,
        label: body.label,
        valid_from: body.valid_from,
        valid_to: body.valid_to ?? null,
        active: true,
      };
      lista = [...lista, conta];
      return { status: 201, data: conta };
    },
    // GET dispatcher shared by fixtures and page tests.
    handle(method: string, url: URL, body?: unknown) {
      const path = url.pathname;
      if (path === '/api/v1/financeiro/nativo/contas')
        return method === 'POST'
          ? this.criar(body as Nova)
          : { status: 200, data: this.contas() };
      if (path === '/api/v1/financeiro/nativo/apostas')
        return {
          status: 200,
          data: this.apostas(Number(url.searchParams.get('limit') ?? 20)),
        };
      if (path === '/api/v1/financeiro/nativo/resumo')
        return { status: 200, data: this.resumo() };
      return undefined;
    },
  };
}

export const nativoVazio = () =>
  nativoFixture({
    contas: [],
    apostas: [],
    resumo: {
      money_contract: 2,
      combined_monetary_total: null,
      totals_by_currency: [],
    },
  });
