import type { components } from '../../src/api/schema';
type Meta = components['schemas']['MetaSaida'];
const common = {
  inicio: '2026-10-01',
  fim: '2026-10-31',
  status: 'ativa',
  linha_base: '0.000000',
  alvo_atingido: false,
} as const;
export const metasFixture: Meta[] = [
  {
    ...common,
    id: 1,
    titulo: 'Resultado de outubro',
    metrica: 'lucro_centavos',
    alvo: '100000.000000',
    valor_atual: '42000.000000',
    progresso: '0.420000',
  },
  {
    ...common,
    id: 2,
    titulo: 'ROI do período',
    metrica: 'roi',
    alvo: '0.080000',
    linha_base: '0.020000',
    valor_atual: '0.100000',
    progresso: '1.333333',
    alvo_atingido: true,
  },
  {
    ...common,
    id: 3,
    titulo: 'Referência de acerto',
    metrica: 'win_rate',
    alvo: '0.600000',
    linha_base: '0.600000',
    valor_atual: '0.550000',
    progresso: null,
  },
  {
    ...common,
    id: 4,
    titulo: 'Leitura do período',
    metrica: 'total_apostas',
    alvo: '100.000000',
    linha_base: '10.000000',
    valor_atual: '44.000000',
    progresso: '0.377778',
    status: 'concluida',
  },
  {
    ...common,
    id: 5,
    titulo: 'Giro registrado',
    metrica: 'giro_centavos',
    alvo: '200000.000000',
    valor_atual: '250000.000000',
    progresso: '1.250000',
    alvo_atingido: true,
    status: 'arquivada',
  },
];
export function createMetasFixture(initial = metasFixture) {
  const data = structuredClone(initial);
  let next = 100;
  let fuso_horario = 'America/Sao_Paulo';
  return {
    data,
    handle(method: string, url: URL, body?: Record<string, unknown>) {
      if (url.pathname === '/api/v1/painel/preferencias') {
        if (method === 'PATCH') fuso_horario = String(body?.fuso_horario);
        return { status: 200, data: { fuso_horario } };
      }
      if (url.pathname === '/api/v1/painel/metas') {
        if (method === 'GET')
          return { status: 200, data: structuredClone(data) };
        if (method === 'POST') {
          const meta: Meta = {
            ...common,
            ...body,
            id: next++,
            titulo: String(body!.titulo),
            metrica: body!.metrica as Meta['metrica'],
            inicio: String(body!.inicio),
            fim: String(body!.fim),
            alvo: String(body!.alvo),
            linha_base: String(body!.linha_base),
            valor_atual: '42000.000000',
            progresso: '0.420000',
          };
          data.push(meta);
          return { status: 201, data: structuredClone(meta) };
        }
      }
      const id = /^\/api\/v1\/painel\/metas\/(\d+)$/.exec(url.pathname)?.[1];
      const item = data.find((meta) => String(meta.id) === id);
      if (!item)
        return { status: 404, data: { detail: 'meta não encontrada' } };
      if (method === 'PATCH') {
        Object.assign(item, body);
        if (body?.alvo === '90000' && item.metrica === 'lucro_centavos')
          item.progresso = '0.466667';
      }
      if (method === 'DELETE') item.status = 'arquivada';
      return { status: 200, data: structuredClone(item) };
    },
  };
}
