import { expect, it } from 'vitest';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { FILTER_READ_CONTRACT } from '../../../tests/fixtures/apostas-contract.generated';
import {
  apostaExemplo,
  apostaPendente,
  paginaExemplo,
  resumoExemplo,
} from '../../../tests/fixtures/apostas';
import {
  juntarPaginas,
  projetarAposta,
  proximaPagina,
  resumoApresentacao,
  texto,
  validarPagina,
  type PaginaApostas,
} from './projecao';

const rule = SITE_READ_CONTRACT['/api/v1/apostas'].response;
const summaryRule = FILTER_READ_CONTRACT['/api/v1/painel/filtrado'].response;
it('exibe os valores da API, mantém nulidade/freebet e não decide finanças', () => {
  expect(projetarAposta(apostaExemplo)).toMatchObject({
    valor: 'R$ 50,00',
    lucro: '+R$ 15,00',
    odd: '2,30',
    conta: 'Conta principal',
    titular: 'Ana',
    banca: 'Banca de futebol',
    origem: 'Telegram',
  });
  expect(projetarAposta(apostaPendente)).toMatchObject({
    lucro: 'Não informado',
    conta: 'Conta não atribuída',
    titular: 'Não informado',
    origem: 'Manual',
  });
  expect(
    projetarAposta({
      ...apostaPendente,
      conta_atribuicao: 'ASSIGNED',
      origem: 'extensao',
    }),
  ).toMatchObject({ conta: 'Nome da conta não informado', origem: 'Coleta' });
  expect(
    projetarAposta({ ...apostaPendente, origem: 'canal novo' }).origem,
  ).toBe('canal novo');
  expect(texto('  ')).toBe('Não informado');
  expect(texto(undefined)).toBe('Não informado');
  expect(() =>
    projetarAposta({ ...apostaPendente, data_aposta: 'invalid' }),
  ).toThrow();
});
it('pagina pelo contrato, substitui duplicata na posição anterior e encerra página vazia', () => {
  const first = paginaExemplo();
  const second = paginaExemplo(2);
  expect(validarPagina(first, rule, 1, 2)).toBe(first);
  expect(
    juntarPaginas([first, second]).map((item) => [item.chave, item.descricao]),
  ).toEqual([
    ['exemplo-1', 'Descrição corrigida'],
    ['exemplo-2', 'Vitória do Corinthians'],
    ['exemplo-3', 'Empate no intervalo'],
  ]);
  expect(juntarPaginas([])).toEqual([]);
  expect(proximaPagina(first)).toBe(2);
  expect(proximaPagina(second)).toBeUndefined();
  expect(proximaPagina({ ...first, data: [] })).toBeUndefined();
  for (const [input, page, size] of [
    [undefined, 1, 2],
    [first, 2, 2],
    [first, 1, 1],
    [{ ...first, pagination: { ...first.pagination, page_size: 1 } }, 1, 1],
    [{ ...first, pagination: { ...first.pagination, total: -1 } }, 1, 2],
    [{ ...first, data: [{ ...apostaPendente, chave: ' ' }] }, 1, 2],
  ] as Array<[PaginaApostas | undefined, number, number]>)
    expect(() => validarPagina(input, rule, page, size)).toThrow();
});
it('formata resumo validado pelo documento candidato, sem somar a página nem substituir null por zero', () => {
  expect(resumoApresentacao(resumoExemplo, summaryRule)).toMatchObject({
    total: 3,
    giro: 'R$ 923,45',
    lucro: 'Não informado',
    roi: 'Não informado',
  });
  expect(
    resumoApresentacao(
      {
        ...resumoExemplo,
        resumo: { ...resumoExemplo.resumo, lucro_centavos: 0, roi: '0.125' },
      },
      summaryRule,
    ),
  ).toMatchObject({ lucro: 'R$ 0,00', roi: '12,5%' });
  for (const change of [
    { total_apostas: -1 },
    { roi: 'invalid' },
    { giro_centavos: 'NaN' },
  ])
    expect(() =>
      resumoApresentacao(
        { ...resumoExemplo, resumo: { ...resumoExemplo.resumo, ...change } },
        summaryRule,
      ),
    ).toThrow();
  expect(() =>
    resumoApresentacao({ ...resumoExemplo, snapshot_em: 'bad' }, summaryRule),
  ).toThrow();
  expect(() => resumoApresentacao(resumoExemplo, undefined)).toThrow();
});
