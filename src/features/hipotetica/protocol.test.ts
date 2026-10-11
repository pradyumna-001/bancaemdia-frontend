import { expect, it } from 'vitest';
import examples from '../../../tests/fixtures/hipotetica.json';
import { comparacaoPublicada, ESTADOS, LIMITACOES } from './protocol';
import { adaptarFiltros, lerFiltros } from '../../lib/params';
import { moeda, porcentagem } from '../../lib/format';

it('conserva os exemplos completos oficiais, sem calcular diferenças ou converter BIGINT em float', () => {
  for (const value of [
    examples.comparado,
    examples.vazio,
    examples.indisponivel,
  ]) {
    expect(comparacaoPublicada(value, { visibilidade: 'ativas' })).toBe(value);
  }
  const data = structuredClone(examples.comparado);
  data.real.lucro_centavos = '9223372036854775807123456789';
  data.hipotetico.roi = '13174928142358700469169.571429';
  const result = comparacaoPublicada(data, {});
  expect(moeda(result.real.lucro_centavos)).toBe(
    'R$ 92.233.720.368.547.758.071.234.567,89',
  );
  expect(porcentagem(result.hipotetico.roi)).toBe(
    '1.317.492.814.235.870.046.916.957,1429%',
  );
  expect(result.diferencas.lucro_centavos).toBe('-14000');
  expect(Object.keys(ESTADOS)).toHaveLength(6);
  expect(Object.keys(LIMITACOES)).toHaveLength(14);
});
it('rejeita dinheiro, métricas, metadados e snapshots inválidos sem mostrar zero inventado', () => {
  for (const patch of [
    { moeda: 'USD' },
    { regra: undefined },
    { fonte_dados: undefined },
    { snapshot_em: '2026-99-99' },
    { respondido_em: 'inválido' },
    { filtros: { ...examples.comparado.filtros, desde: '2026-99-99' } },
    { filtros: { ...examples.comparado.filtros, casa_id: '7' } },
    {
      real: {
        ...examples.comparado.real,
        lucro_centavos: Number.MAX_SAFE_INTEGER + 1,
      },
    },
    { real: { ...examples.comparado.real, roi: 'segredo' } },
    { hipotetico: { ...examples.comparado.hipotetico, win_rate: '1e3' } },
    { estado: 'inventado' },
  ])
    expect(() =>
      comparacaoPublicada({ ...examples.comparado, ...patch }, {}),
    ).toThrow('Não foi possível ler a resposta do serviço.');
  const data = structuredClone(examples.comparado);
  Reflect.deleteProperty(data, 'unidade');
  expect(() => comparacaoPublicada(data, {})).toThrow();
});
it('confere recorte aplicado e datas equivalentes; ignora fresh somente como controle de leitura', () => {
  const data = structuredClone(examples.comparado);
  data.filtros.casa_id = '9007199254740993' as never;
  data.filtros.desde = '2026-10-01T03:00:00Z' as never;
  expect(
    comparacaoPublicada(data, {
      casa_id: '9007199254740993',
      desde: '2026-10-01T00:00:00-03:00',
      fresh: true,
    }),
  ).toBe(data);
  expect(() => comparacaoPublicada(data, { casa_id: '7' })).toThrow();
  expect(() =>
    comparacaoPublicada(data, { ate: '2026-10-01T00:00:00-03:00' }),
  ).toThrow();
});
it('envia apenas filtros suportados, sem paginação, stake livre ou fragmento, incluindo auditoria explícita', () => {
  const { query, bloqueios } = adaptarFiltros(
    lerFiltros(
      new URLSearchParams(
        'casa=9007199254740993&tipster=7&apagadas=1&page=2&page_size=50&stake=800&desde=2026-10-01&ate=2026-10-02',
      ),
    ),
    'hipotetica',
  );
  expect(bloqueios).toEqual([]);
  expect(query).toEqual({
    casa_id: '9007199254740993',
    tipster_id: '7',
    visibilidade: 'apagadas',
    desde: '2026-10-01T03:00:00.000Z',
    ate: '2026-10-03T03:00:00.000Z',
  });
});
