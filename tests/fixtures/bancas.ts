import type { components } from '../../src/api/schema';

type Banca = components['schemas']['BancaSaida'];
type Operacao = 'CRIAR' | 'ALTERAR' | 'ARQUIVAR';

// Synthetic test data only; shapes and refusals follow the pinned OpenAPI
// and docs/contracts/bancas-cadastro.md of the API.
export function bancasFixture({
  agora = '2026-11-04T18:00:00Z',
  iniciais = [
    {
      id: 1,
      nome: 'Banca principal',
      estado: 'ativa' as const,
      arquivada_em: null,
      saldo_inicial_centavos: 100000,
      contas: [{ id: 11, casa_id: 7, apelido: 'Betano principal' }],
    },
    {
      id: 2,
      nome: 'Reserva',
      estado: 'ativa' as const,
      arquivada_em: null,
      saldo_inicial_centavos: null,
      contas: [],
    },
  ] as Banca[],
} = {}) {
  let bancas: Banca[] = structuredClone(iniciais);
  let proximo = 100;
  const gravadas = new Map<
    string,
    { operacao: Operacao; pedido: string; status: number; resposta: Banca }
  >();
  function idempotente(
    key: string,
    operacao: Operacao,
    pedido: unknown,
    efeito: () => { status: number; data: unknown },
  ) {
    const raw = JSON.stringify([operacao, pedido]);
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
        resposta: result.data as Banca,
      });
    return result;
  }
  const emUso = (nome: string, exceto?: number) =>
    bancas.some(
      (b) => b.id !== exceto && b.nome.toLowerCase() === nome.toLowerCase(),
    );
  const salvar = (banca: Banca) => {
    bancas = bancas.map((b) => (b.id === banca.id ? banca : b));
    return banca;
  };
  return {
    lista: () => ({ bancas }),
    criar(
      key: string,
      body: { nome: string; saldo_inicial_centavos?: number | null },
    ) {
      return idempotente(key, 'CRIAR', body, () => {
        const nome = body.nome.trim();
        if (emUso(nome))
          return { status: 409, data: { detail: 'nome_em_uso' } };
        const banca: Banca = {
          id: proximo++,
          nome,
          estado: 'ativa',
          arquivada_em: null,
          saldo_inicial_centavos: body.saldo_inicial_centavos ?? null,
          contas: [],
        };
        bancas = [...bancas, banca];
        return { status: 201, data: banca };
      });
    },
    alterar(
      key: string,
      id: number,
      body: { nome?: string | null; saldo_inicial_centavos?: number | null },
    ) {
      return idempotente(key, 'ALTERAR', [id, body], () => {
        const banca = bancas.find((b) => b.id === id);
        if (!banca)
          return { status: 404, data: { detail: 'banca_nao_encontrada' } };
        if (banca.estado === 'arquivada')
          return { status: 409, data: { detail: 'banca_arquivada' } };
        const nome = body.nome?.trim() ?? banca.nome;
        if (emUso(nome, id))
          return { status: 409, data: { detail: 'nome_em_uso' } };
        return {
          status: 200,
          data: salvar({
            ...banca,
            nome,
            saldo_inicial_centavos:
              'saldo_inicial_centavos' in body
                ? (body.saldo_inicial_centavos ?? null)
                : banca.saldo_inicial_centavos,
          }),
        };
      });
    },
    arquivar(key: string, id: number) {
      return idempotente(key, 'ARQUIVAR', id, () => {
        const banca = bancas.find((b) => b.id === id);
        if (!banca)
          return { status: 404, data: { detail: 'banca_nao_encontrada' } };
        if (banca.estado === 'arquivada')
          return { status: 409, data: { detail: 'banca_arquivada' } };
        if (banca.contas.length)
          return { status: 409, data: { detail: 'banca_com_contas' } };
        return {
          status: 200,
          data: salvar({ ...banca, estado: 'arquivada', arquivada_em: agora }),
        };
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
