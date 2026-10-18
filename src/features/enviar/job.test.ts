import { expect, it } from 'vitest';
import {
  partialUpload,
  acceptedUpload,
} from '../../../tests/fixtures/api/responses';
import { etapaJob, jobIdValido, projetarJob, resultadoJob } from './job';

const id = acceptedUpload.job_id;
it('aceita somente UUID completo; não segue URL, query, caminho ou ID sequencial', () => {
  expect(jobIdValido(id.toUpperCase())).toBe(id);
  for (const input of [
    undefined,
    null,
    '',
    '1',
    id + '?segredo=teste',
    '/' + id,
    'https://host/' + id,
    ' ' + id,
  ])
    expect(jobIdValido(input)).toBeUndefined();
});

it.each([
  ['pending', 'Na fila', undefined],
  ['processing', 'Processando', undefined],
  ['completed', 'Processamento concluído', 'parcial'],
  ['failed', 'Não foi possível concluir o processamento', 'falha'],
])(
  'projeta o estado real %s sem inferir conclusão pelo percentual',
  (status, etapa, result) => {
    const projected = projetarJob({ ...partialUpload, status }, id);
    expect(etapaJob(projected)).toBe(etapa);
    expect(resultadoJob(projected)).toBe(result);
    expect(projected.progress.percent).toBe(100);
  },
);

it('retém contagens e percentual fornecidos sem expor custo, estimativa, arquivo ou erro bruto', () => {
  const projected = projetarJob(
    {
      ...partialUpload,
      erro: 'INTERNAL_STACK_COST_TEST',
      cost_usd: 987,
      estimated_cost_usd: 123,
    },
    id,
  );
  expect(projected.bets_processed).toBe(2);
  expect(projected.bets_failed).toBe(1);
  expect(projected.progress).toEqual(partialUpload.progress);
  expect(projected).not.toHaveProperty('erro');
  expect(projected).not.toHaveProperty('filename');
  expect(JSON.stringify(projected)).not.toMatch(
    /cost|estimated|INTERNAL_STACK/,
  );
  expect(Object.isFrozen(projected.progress)).toBe(true);
});

it.each([null, undefined])(
  'percentual ausente (%s) não vira zero ou 100',
  (value) => {
    const data = { ...partialUpload, progress: { ...partialUpload.progress } };
    Reflect.set(data.progress, 'percent', value);
    expect(projetarJob(data, id).progress).not.toHaveProperty('percent');
  },
);

it('preserva percentual fracionário da API e normaliza somente o UUID', () => {
  const data = {
    ...partialUpload,
    job_id: id.toUpperCase(),
    progress: { ...partialUpload.progress, percent: 42.5 },
  };
  expect(projetarJob(data, id).progress.percent).toBe(42.5);
  expect(projetarJob(data, id).job_id).toBe(id);
});

it.each(['unknown', 'partial', 'COMPLETED', '__proto__', 'constructor'])(
  'estado %s não é sucesso nem etapa inventada',
  (status) => {
    expect(() => projetarJob({ ...partialUpload, status }, id)).toThrow(
      'Não foi possível ler a resposta',
    );
  },
);

it.each([-1, 101, NaN, Infinity, '80'])(
  'recusa percentual inválido %s',
  (value) => {
    const data = { ...partialUpload, progress: { ...partialUpload.progress } };
    Reflect.set(data.progress, 'percent', value);
    expect(() => projetarJob(data, id)).toThrow();
  },
);

it.each(['total', 'pending', 'read', 'failed', 'ignored', 'over_limit'])(
  'recusa contagem inválida %s, sem fabricar padrão',
  (field) => {
    const data = { ...partialUpload, progress: { ...partialUpload.progress } };
    Reflect.set(data.progress, field, -1);
    expect(() => projetarJob(data, id)).toThrow();
  },
);

it.each(['total_messages', 'bets_processed', 'bets_failed'])(
  'recusa contagem ausente/sem precisão %s',
  (field) => {
    const data = { ...partialUpload };
    Reflect.set(data, field, Number.MAX_SAFE_INTEGER + 1);
    expect(() => projetarJob(data, id)).toThrow();
  },
);

it('recusa job alheio, resposta sem progresso e corpo vazio', () => {
  expect(() =>
    projetarJob(partialUpload, '00000000-0000-0000-0000-000000000000'),
  ).toThrow();
  const data = { ...partialUpload };
  Reflect.set(data, 'progress', null);
  expect(() => projetarJob(data, id)).toThrow();
  expect(() => projetarJob(undefined!, id)).toThrow();
});

it('distingue conclusão completa, vazia e parcial por limite ou falha', () => {
  const clean = {
    ...partialUpload,
    bets_failed: 0,
    progress: { ...partialUpload.progress, failed: 0 },
  };
  expect(resultadoJob(projetarJob(clean, id))).toBe('completo');
  expect(resultadoJob(projetarJob({ ...clean, bets_processed: 0 }, id))).toBe(
    'vazio',
  );
  expect(
    resultadoJob(
      projetarJob({ ...clean, progress: { ...clean.progress, failed: 1 } }, id),
    ),
  ).toBe('parcial');
  expect(
    resultadoJob(
      projetarJob(
        { ...clean, progress: { ...clean.progress, over_limit: 1 } },
        id,
      ),
    ),
  ).toBe('parcial');
});
