import { expect, it } from 'vitest';
import { diario, grupos } from '../../../tests/fixtures/painel';
import {
  apresentarMetricas,
  validarDiario,
  validarHierarquia,
  juntarGrupos,
  nomeGrupo,
  nomeTipster,
  seletoresCanonicos,
  validarLegado,
  validarComparacoes,
} from './protocol';
import { legado, filtrado } from '../../../tests/fixtures/painel';
it('validates the published whole-document examples and canonical selection', () => {
  expect(validarDiario(diario)).toEqual(diario);
  expect(validarHierarquia(grupos)).toEqual(grupos);
  expect(validarLegado(legado)).toEqual(legado);
  expect(validarComparacoes(filtrado)).toEqual(filtrado);
  expect(() =>
    validarComparacoes({ ...filtrado, snapshot_em: 'bad' }),
  ).toThrow();
  expect(() => validarLegado({ ...legado, atualizado_em: 'bad' })).toThrow();
  expect(() =>
    validarLegado({
      ...legado,
      evolucao: [
        {
          periodo_inicio: 'bad',
          banca_id: null,
          banca_nome: null,
          lucro_periodo_centavos: 0,
          lucro_acumulado_centavos: 0,
          saldo_centavos: null,
        },
      ],
    }),
  ).toThrow();
  expect(seletoresCanonicos(diario)).toEqual(diario.filtros);
  expect(
    seletoresCanonicos({
      filtros: {
        ...diario.filtros,
        periodo: '90d',
        incluir_apagadas: false,
        visibilidade: 'apagadas',
      },
    }),
  ).toEqual({ ...diario.filtros, visibilidade: 'apagadas' });
});
it('preserves exact BIGINT money, sign, confirmed zero and unknown values', () => {
  const m = diario.total_periodo;
  expect(
    apresentarMetricas({ ...m, lucro_centavos: '9007199254740993' }).lucro,
  ).toContain('90.071.992.547.409,93');
  expect(apresentarMetricas({ ...m, lucro_centavos: '-1' }).sinal).toBe(
    'perda',
  );
  expect(apresentarMetricas({ ...m, lucro_centavos: '0' }).estado).toBe(
    'Zero confirmado',
  );
  expect(apresentarMetricas(diario.sem_data).estado).toBe('Sem atividade');
  for (const estado_dado of [
    'pendente',
    'parcial',
    'desconhecido',
    'fora_do_financeiro',
  ] as const) {
    expect(
      apresentarMetricas({
        ...m,
        lucro_centavos: null,
        retorno_centavos: null,
        roi: null,
        estado_dado,
      }).sinal,
    ).toBe('');
    expect(() => apresentarMetricas({ ...m, estado_dado })).toThrow();
  }
  expect(() => apresentarMetricas({ ...m, total_apostas: -1 })).toThrow();
});
it('rejects malformed, discontinuous, duplicate, missing and unsafe daily data', () => {
  for (const modify of [
    (d: typeof diario) => {
      d.intervalo_devolvido.dias = 2;
    },
    (d: typeof diario) => {
      d.dias[0]!.dia = '2026-02-30';
    },
    (d: typeof diario) => {
      d.dias[0]!.dia = '2026-01-02';
    },
    (d: typeof diario) => {
      d.total_periodo.lucro_centavos = 'garbage';
    },
    (d: typeof diario) => {
      d.total_periodo.total_apostas = Number.MAX_SAFE_INTEGER + 1;
    },
  ]) {
    const d = structuredClone(diario);
    modify(d);
    expect(() => validarDiario(d)).toThrow();
  }
  expect(() => validarDiario({})).toThrow();
});
it('upserts identities across pages without adding money or duplicating facts', () => {
  const a = structuredClone(grupos);
  a.grupos[0]!.total_filhos = 2;
  const b = structuredClone(a);
  b.grupos[0]!.tipsters[0]!.id = '3';
  expect(juntarGrupos([a, b, b])[0]!.tipsters).toHaveLength(2);
  expect(juntarGrupos([a, b])[0]!.metricas).toEqual(a.grupos[0]!.metricas);
  b.grupos[0]!.metricas.lucro_centavos = '101';
  expect(() => juntarGrupos([a, b])).toThrow();
  b.grupos[0]!.metricas = a.grupos[0]!.metricas;
  b.grupos[0]!.total_filhos = 1;
  expect(() => juntarGrupos([a, b])).toThrow();
  const c = structuredClone(grupos);
  c.grupos[0]!.tipsters[0]!.id = '3';
  expect(() => juntarGrupos([grupos, c])).toThrow();
  expect(juntarGrupos([])).toEqual([]);
  const changed = structuredClone(grupos);
  changed.total_periodo.total_apostas = 2;
  expect(() => juntarGrupos([grupos, changed])).toThrow();
  changed.total_periodo = grupos.total_periodo;
  changed.total_grupos = 2;
  expect(() => juntarGrupos([grupos, changed])).toThrow();
  changed.total_grupos = grupos.total_grupos;
  changed.total_filhos = 2;
  expect(() => juntarGrupos([grupos, changed])).toThrow();
  const looping = { ...grupos, proximo_cursor: 'loop' };
  expect(() => juntarGrupos([looping, looping])).toThrow();
});
it('rejects duplicate group/child identities and impossible counts', () => {
  const cases = [
    (d: typeof grupos) => {
      d.total_grupos = -1;
    },
    (d: typeof grupos) => {
      d.total_filhos = -1;
    },
    (d: typeof grupos) => {
      d.grupos.push(d.grupos[0]!);
    },
    (d: typeof grupos) => {
      d.grupos[0]!.tipsters.push(d.grupos[0]!.tipsters[0]!);
      d.grupos[0]!.total_filhos = 2;
    },
    (d: typeof grupos) => {
      d.grupos[0]!.total_filhos = 0;
    },
  ];
  for (const change of cases) {
    const d = structuredClone(grupos);
    change(d);
    expect(() => validarHierarquia(d)).toThrow();
  }
});
it('names historical attribution categories without making groups synonymous with tipsters', () => {
  const g = grupos.grupos[0]!;
  const t = g.tipsters[0]!;
  for (const atribuicao of ['sem_grupo', 'ambigua', 'nao_resolvida'] as const)
    expect(nomeGrupo({ ...g, nome: null, atribuicao })).toBeTruthy();
  expect(nomeGrupo({ ...g, nome: ' ' })).toBe('Nome do grupo não informado');
  for (const atribuicao of ['sem_tipster', 'nao_resolvido'] as const)
    expect(nomeTipster({ ...t, nome: null, atribuicao })).toBeTruthy();
  expect(nomeTipster({ ...t, nome: null })).toBe(
    'Nome do tipster não informado',
  );
  expect(nomeTipster(t)).toBe(t.nome);
});
