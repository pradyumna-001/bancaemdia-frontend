import { expect, it } from 'vitest';
import {
  barras,
  diaCalendario,
  escalaZero,
  evolucao,
  type GrupoLucro,
  type PontoEvolucao,
} from './geometria';
export const ponto = (dia: string, valor: number): PontoEvolucao => ({
  periodo_inicio: dia,
  lucro_acumulado_centavos: valor,
  lucro_periodo_centavos: 777,
  banca_id: null,
  banca_nome: null,
  saldo_centavos: null,
});
export const grupo = (valor: number, n: number): GrupoLucro => ({
  id: 1,
  nome: 'Grupo',
  familia: null,
  metricas: {
    lucro_centavos: valor,
    total_apostas: n,
    base_roi_centavos: 0,
    freebets: 0,
    giro_centavos: 0,
    greens: 0,
    pendentes: 0,
    reds: 0,
    retorno_centavos: 0,
    roi: '0',
    roi_basis_points: 0,
    win_rate: '0',
    win_rate_basis_points: 0,
  },
});

it.each([
  [[10, 20], 0],
  [[-20, -10], 300],
  [[-20, 20], 150],
  [[0, 0], 150],
  [[], 150],
] as const)('inclui zero na escala de %j', (valores, zero) => {
  const escala = escalaZero(valores, 0, 300);
  expect(escala.zero).toBe(zero);
});
it('preserva calendário, ordena sem mutação e não acumula valores recebidos', () => {
  const dados = [
    ponto('2026-03-11', 90),
    ponto('2026-03-01', -30),
    ponto('2026-03-02', 20),
  ];
  const { pontos } = evolucao(dados);
  expect(pontos.map((p) => p.x)).toEqual([40, 64, 280]);
  expect(pontos.map((p) => p.dado.lucro_acumulado_centavos)).toEqual([
    -30, 20, 90,
  ]);
  expect(dados[0]?.periodo_inicio).toBe('2026-03-11');
  expect(diaCalendario('2024-03-01') - diaCalendario('2024-02-28')).toBe(2);
});
it('trata vazio, um ponto e série zerada sem NaN', () => {
  expect(evolucao([]).pontos).toEqual([]);
  expect(evolucao([ponto('2026-09-01', 0)]).pontos[0]).toMatchObject({
    x: 160,
    y: 100,
  });
});
it('barras têm origem e direção corretas, comprimento proporcional e espessura raiz', () => {
  const { eixo, itens } = barras([grupo(-100, 4), grupo(200, 16), grupo(0, 0)]);
  expect(itens[0]!.x + itens[0]!.largura).toBeCloseTo(eixo.zero);
  expect(itens[1]!.x).toBe(eixo.zero);
  expect(itens[1]!.largura / itens[0]!.largura).toBeCloseTo(2);
  expect(itens.map((i) => i.espessura)).toEqual([12, 24, 0]);
  expect(itens[2]!.largura).toBe(0);
});
it('mantém coordenadas finitas nos extremos seguros do JSON', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const { itens } = barras([grupo(-max, 1), grupo(max, max)]);
  for (const item of itens)
    for (const value of [item.x, item.largura, item.espessura])
      expect(Number.isFinite(value)).toBe(true);
  expect(
    evolucao([ponto('2026-01-01', -max), ponto('2026-01-31', max)]).pontos.map(
      (p) => p.y,
    ),
  ).toEqual([160, 40]);
});
it.each([NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  'rejeita valores financeiros sem precisão: %s',
  (valor) => {
    expect(() => barras([grupo(valor, 1)])).toThrow();
    expect(() => evolucao([ponto('2026-01-01', valor)])).toThrow();
  },
);
it.each([-1, 0.5, Infinity])('rejeita quantidade inválida %s', (n) =>
  expect(() => barras([grupo(0, n)])).toThrow(),
);
it.each(['2026-02-30', '2026-13-01', '2026-1-01', 'não é data'])(
  'rejeita data inválida %s',
  (data) => expect(() => diaCalendario(data)).toThrow(),
);
it('não conecta bancas distintas ou datas duplicadas como se fossem uma série', () => {
  expect(() =>
    evolucao([ponto('2026-01-01', 0), ponto('2026-01-01', 10)]),
  ).toThrow();
  expect(() =>
    evolucao([
      ponto('2026-01-01', 0),
      { ...ponto('2026-01-02', 10), banca_id: 2 },
    ]),
  ).toThrow();
});
