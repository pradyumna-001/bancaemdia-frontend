import type { components } from '../../src/api/schema';

type Unidade = components['schemas']['UnidadeSaida'];
type Recibo = components['schemas']['ReciboVigenciaSaida'];
type Vigencia = components['schemas']['VigenciaSaida'];

const padrao: Vigencia = {
  id: null,
  origem: 'padrao',
  valor_centavos: 10000,
  vigente_de: null,
  vigente_ate: null,
  vigente_de_local: null,
};

// Synthetic test data only; shapes follow the pinned OpenAPI.
export const unidadePadrao: Unidade = {
  vigente: padrao,
  historico: [],
  fuso_horario: 'America/Sao_Paulo',
  padrao_centavos: 10000,
  limite_centavos: 10000000,
};

export function unidadeFixture() {
  let atual: Unidade = structuredClone(unidadePadrao);
  const recibos = new Map<string, { body: string; recibo: Recibo }>();
  let proximo = 1;
  return {
    get: () => atual,
    // Same key and body returns the original receipt; another body is 409.
    post(key: string, body: { valor_centavos: number }, agora: string) {
      const raw = JSON.stringify(body);
      const known = recibos.get(key);
      if (known)
        return known.body === raw
          ? { status: 201, data: known.recibo }
          : { status: 409, data: { detail: 'idempotency_key_conflict' } };
      const anterior = { ...atual.vigente, vigente_ate: agora };
      const vigencia: Vigencia = {
        id: proximo++,
        origem: 'usuario',
        valor_centavos: body.valor_centavos,
        vigente_de: agora,
        vigente_ate: null,
        vigente_de_local: null,
      };
      atual = {
        ...atual,
        vigente: vigencia,
        historico: [
          vigencia,
          ...atual.historico.map((item) =>
            item.vigente_ate === null ? { ...item, vigente_ate: agora } : item,
          ),
        ],
      };
      const recibo: Recibo = {
        vigencia,
        anterior,
        vale_a_partir_de: agora,
        apostas_existentes_alteradas: 0,
        fuso_horario: atual.fuso_horario,
      };
      recibos.set(key, { body: raw, recibo });
      return { status: 201, data: recibo };
    },
    intencao(key: string) {
      const known = recibos.get(key);
      return known
        ? { status: 200, data: known.recibo }
        : { status: 404, data: { detail: 'intencao_nao_encontrada' } };
    },
  };
}
