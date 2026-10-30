import { expect, it } from 'vitest';
import {
  analises,
  bucket,
  caixaAnalises,
} from '../../../../tests/fixtures/analises';
import {
  consultaAnalises,
  validarAnalises,
  validarCaixa,
  nomeBucket,
  motivoProgressao,
  sinal,
  type Bucket,
} from './protocol';
it('keeps exact supported IDs and declares all other URL filters separately', () => {
  const input = new URLSearchParams(
    'casa=9223372036854775807&tipster=2&mercado=3&apagadas=1&titular=9&periodo=all&desde=2026-01-01',
  );
  const q = consultaAnalises(input);
  expect(q.query).toEqual({
    periodo: 'all',
    casa_id: '9223372036854775807',
    tipster_id: '2',
    mercado_id: '3',
  });
  expect(q.preservados).toContain('apagadas');
  expect(q.preservados).toContain('desde');
  expect(input.get('titular')).toBe('9');
  for (const bad of ['periodo=bad&casa=-2', 'periodo=all&periodo=7d', ''])
    expect(consultaAnalises(new URLSearchParams(bad)).periodo).toBe('30d');
});
it('validates one complete response without deriving or summing money', () => {
  expect(validarAnalises(analises)).toBe(analises);
  expect(validarCaixa(caixaAnalises)).toBe(caixaAnalises);
  expect([sinal(-1), sinal(0), sinal(1)]).toEqual(['perda', '', 'lucro']);
  const omitted = structuredClone(analises);
  delete omitted.por_esporte[0]!.progressao;
  delete omitted.por_esporte[0]!.capital_banca_centavos;
  expect(validarAnalises(omitted)).toBe(omitted);
  const missingInitial = structuredClone(caixaAnalises);
  delete missingInitial.evolucao[0]!.saldo_inicial_centavos;
  expect(validarCaixa(missingInitial)).toBe(missingInitial);
});
it('rejects unsafe money, duplicate categories, negative counts and invalid freshness', () => {
  const mutations = [
    (d: typeof analises) => {
      d.total_filtrado.lucro_centavos = Number.MAX_SAFE_INTEGER + 1;
    },
    (d: typeof analises) => {
      d.total_filtrado.total_apostas = -1;
    },
    (d: typeof analises) => {
      d.odds_desconhecidas = 1.5;
    },
    (d: typeof analises) => {
      d.por_esporte.push(d.por_esporte[0]!);
    },
    (d: typeof analises) => {
      d.fuso_horario = 'invalid/fuso';
    },
    (d: typeof analises) => {
      d.profit_factor = 'secret-diagnostic';
    },
  ];
  for (const change of mutations) {
    const d = structuredClone(analises);
    change(d);
    expect(() => validarAnalises(d)).toThrow();
  }
  expect(() => validarAnalises(undefined)).toThrow();
  const repeated = structuredClone(caixaAnalises);
  repeated.evolucao.push(repeated.evolucao[0]!);
  expect(() => validarCaixa(repeated)).toThrow();
  const bad = structuredClone(caixaAnalises);
  bad.evolucao[0]!.depositos_periodo_centavos = NaN;
  expect(() => validarCaixa(bad)).toThrow();
  const badId = structuredClone(caixaAnalises);
  badId.evolucao[0]!.banca_id = 1.5;
  expect(() => validarCaixa(badId)).toThrow();
});
it('labels the public buckets, unknown dimensions and null progression without fabrication', () => {
  const b = (change: Partial<Bucket>) => ({ ...bucket, ...change });
  expect(nomeBucket(b({ nome: 'Tênis' }), 'por_esporte')).toBe('Tênis');
  expect(nomeBucket(bucket, 'por_esporte')).toBe('Esporte não informado');
  expect(nomeBucket(b({ chave: '9' }), 'por_esporte')).toBe('Esporte sem nome');
  expect(nomeBucket(b({ chave: 'lt_1_50' }), 'faixas_odds')).toContain('1,50');
  expect(nomeBucket(b({ chave: 'x' }), 'faixas_odds')).toContain(
    'não identificada',
  );
  expect(nomeBucket(b({ chave: '6:noite' }), 'heatmap')).toContain('Domingo');
  expect(nomeBucket(bucket, 'heatmap')).toContain('não identificados');
  expect(nomeBucket(b({ chave: '2:x' }), 'heatmap')).toContain(
    'não identificados',
  );
  expect(nomeBucket(b({ nome: 'Reserva' }), 'por_banca_progressao')).toBe(
    'Reserva',
  );
  expect(nomeBucket(bucket, 'por_banca_progressao')).toBe(
    'Sem banca atribuída',
  );
  expect(nomeBucket(b({ chave: '2' }), 'por_banca_progressao')).toBe(
    'Banca sem nome',
  );
  expect(nomeBucket(b({ chave: 'not_applicable' }), 'quartis_stake')).toContain(
    'não aplicável',
  );
  expect(
    nomeBucket(
      b({
        chave: 'q2',
        valor_face_min_centavos: 100,
        valor_face_max_centavos: 200,
      }),
      'quartis_stake',
    ),
  ).toContain('R$ 1,00');
  expect(nomeBucket(b({ chave: 'q1' }), 'quartis_stake')).toContain(
    'Não informado',
  );
  expect(nomeBucket(bucket, 'quartis_stake')).toContain('não identificada');
  expect(motivoProgressao(bucket)).toBe('Sem banca atribuída');
  expect(
    motivoProgressao(b({ motivo_progressao: 'capital_ausente_ou_zero' })),
  ).toContain('Capital');
  expect(motivoProgressao(b({ progressao: '0.25' }))).toBe('25%');
  expect(motivoProgressao(b({ motivo_progressao: null }))).toBe(
    'Progressão não informada',
  );
});
