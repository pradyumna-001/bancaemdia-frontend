import type { components } from '../../src/api/schema';

type Previa = components['schemas']['PreviaSaida'];
type Lote = components['schemas']['LoteSaida'];
type Operacao = 'APAGAR' | 'RESTAURAR';
type Gravada = {
  operacao: Operacao;
  pedido: string;
  status: number;
  resposta: Lote;
};

const LOTE_ID = '0b9f6c1e-2d4a-4e8b-9c3f-5a7d1e2b4c6f';

// Synthetic test data only; shapes and refusals follow the pinned OpenAPI
// and docs/contracts/apagar-apostas-lote.md of the API.
export function loteFixture({
  ativas = 12,
  agora = '2026-11-04T18:00:00Z',
  expira = '2026-11-04T18:10:00Z',
}: { ativas?: number; agora?: string; expira?: string } = {}) {
  let total = ativas;
  let versao = 1;
  let lote: Lote | undefined;
  const gravadas = new Map<string, Gravada>();
  const frase = () => `APAGAR ${total} APOSTAS`;
  function idempotente(
    key: string,
    operacao: Operacao,
    pedido: unknown,
    efeito: () => { status: number; data: unknown },
  ) {
    const raw = JSON.stringify(pedido);
    const known = gravadas.get(key);
    if (known)
      return known.pedido === raw
        ? { status: known.status, data: known.resposta }
        : { status: 409, data: { detail: 'idempotency_key_conflict' } };
    const result = efeito();
    // Refusals are not recorded.
    if (result.status < 300)
      gravadas.set(key, {
        operacao,
        pedido: raw,
        status: result.status,
        resposta: result.data as Lote,
      });
    return result;
  }
  return {
    get total() {
      return total;
    },
    // Someone changes the active set after the preview.
    mudar() {
      versao++;
      total++;
    },
    previa(): Previa {
      return {
        escopo: 'apostas',
        total,
        frase: frase(),
        confirmacao: `assinada:${versao}:${total}`,
        expira_em: expira,
      };
    },
    apagar(
      key: string,
      body: { acao: string; confirmacao: string; frase: string },
    ) {
      return idempotente(key, 'APAGAR', body, () => {
        if (body.confirmacao !== `assinada:${versao}:${total}`)
          return {
            status: 409,
            data: { detail: 'confirmacao_desatualizada' },
          };
        if (body.frase.trim().toLowerCase() !== frase().toLowerCase())
          return { status: 422, data: { detail: 'frase_incorreta' } };
        if (total === 0)
          return { status: 409, data: { detail: 'nada_a_apagar' } };
        lote = {
          lote_id: LOTE_ID,
          escopo: 'apostas',
          apostas_afetadas: total,
          criado_em: agora,
          restaurado_em: null,
          apostas_restauradas: null,
        };
        total = 0;
        versao++;
        return { status: 201, data: lote };
      });
    },
    consultar(id: string) {
      return lote && lote.lote_id === id
        ? { status: 200, data: lote }
        : { status: 404, data: { detail: 'lote_nao_encontrado' } };
    },
    restaurar(key: string, id: string) {
      return idempotente(key, 'RESTAURAR', { lote_id: id }, () => {
        if (!lote || lote.lote_id !== id)
          return { status: 404, data: { detail: 'lote_nao_encontrado' } };
        if (lote.restaurado_em !== null)
          return { status: 409, data: { detail: 'lote_restaurado' } };
        lote = {
          ...lote,
          restaurado_em: agora,
          apostas_restauradas: lote.apostas_afetadas,
        };
        total = lote.apostas_afetadas;
        versao++;
        return { status: 200, data: lote };
      });
    },
    intencao(key: string) {
      const known = gravadas.get(key);
      return known
        ? {
            status: 200,
            data: {
              operacao: known.operacao,
              status_code: known.status,
              resposta: known.resposta,
            },
          }
        : { status: 404, data: { detail: 'intencao_nao_encontrada' } };
    },
  };
}
export const LOTE_FIXTURE_ID = LOTE_ID;
