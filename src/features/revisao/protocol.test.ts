import { expect, it } from 'vitest';
import {
  revisaoLeitura,
  revisaoConta,
  revisaoPar,
  revisaoPrint,
  revisaoFixture,
} from '../../../tests/fixtures/revisao';
import {
  caminhoRevisao,
  decidir,
  idValido,
  lerRevisao,
  rascunhoInicial,
  uuidValido,
  validarFila,
  validarRecibo,
  validarRevisao,
  type Revisao,
} from './protocol';
const id = 'a1234567-1234-1234-1234-123456789abc';
it('mantém BIGINT exato no caminho e na escolha explícita', () => {
  for (const value of [
    null,
    '',
    '0',
    '01',
    '-1',
    '9223372036854775808',
    '../42',
  ])
    expect(idValido(value)).toBe(false);
  expect(idValido('9223372036854775807')).toBe(true);
  expect(
    caminhoRevisao('9007199254740993').pathSerializer(
      '/revisoes/{revisao_id}/foto',
    ),
  ).toBe('/revisoes/9007199254740993/foto');
  expect(() => caminhoRevisao('0')).toThrow();
  expect(uuidValido(id)).toBe(true);
  expect(uuidValido(null)).toBe(false);
  expect(uuidValido('x')).toBe(false);
  expect(
    decidir(revisaoConta, 'CORRIGIR', {}, '9007199254740993', '').conta_casa_id,
  ).toBe('9007199254740993');
  expect(() => decidir(revisaoConta, 'CORRIGIR', {}, '', '')).toThrow(/conta/);
  const item = structuredClone(revisaoConta);
  item.conta!.candidatos[0]!.elegivel_escolha_explicita = false;
  expect(() => decidir(item, 'CORRIGIR', {}, '9007199254740993', '')).toThrow();
});
it('normaliza parâmetros sem apagar os demais filtros e usa abertura civil inteira', () => {
  const p = new URLSearchParams(
    'motivo=leitura&aberta_desde=2026-10-01&aberta_ate=2026-10-14&revisao_pagina=2&casa=7&apagadas=1',
  );
  expect(lerRevisao(p).query).toEqual({
    familia: 'leitura',
    desde: '2026-10-01T03:00:00.000Z',
    ate: '2026-10-15T03:00:00.000Z',
    page: 2,
    page_size: 20,
  });
  expect(p.get('apagadas')).toBe('1');
  for (const q of [
    'motivo=x&aberta_desde=x&aberta_ate=9999-12-31&revisao_pagina=-1',
    'motivo=conta&motivo=leitura&aberta_desde=2026-10-15&aberta_ate=2026-10-01',
    'revisao_pagina=99999999999',
    'aberta_desde=2026-02-30&aberta_ate=x',
  ])
    expect(lerRevisao(new URLSearchParams(q)).query).toEqual({
      page: 1,
      page_size: 20,
    });
});
it('valida identidade, datas, valores recebidos, conta, estado e precondição', () => {
  expect(validarRevisao(revisaoLeitura, '101')).toBe(revisaoLeitura);
  expect(() => validarRevisao(undefined)).toThrow();
  expect(() => validarRevisao(revisaoLeitura, '102')).toThrow();
  for (const changes of [
    { id: '0' },
    { precondicao: 'x' },
    { estado: 'resolvida', acoes: ['CORRIGIR'] },
    { criado_em: 'x' },
    {
      conta: {
        ...revisaoConta.conta,
        candidatos: [{ ...revisaoConta.conta!.candidatos[0], id: '0' }],
      },
    },
  ])
    expect(() =>
      validarRevisao({ ...revisaoLeitura, ...changes } as Revisao),
    ).toThrow();
  expect(
    validarRevisao({
      ...revisaoLeitura,
      estado: 'resolvida',
      acoes: [],
      resolvido_em: '2026-10-15T12:00:00Z',
    }).estado,
  ).toBe('resolvida');
  expect(validarRevisao(revisaoConta)).toBe(revisaoConta);
});
it('fila usa população/snapshot e recibo confere UUID, revisão e ação', () => {
  const f = revisaoFixture();
  const url = new URL('https://test/api/v1/revisao-operacional/fila');
  const page = f.handle('GET', url).data as Parameters<typeof validarFila>[0];
  expect(validarFila(page).total_global).toBe(6);
  expect(() => validarFila(undefined)).toThrow();
  const body = decidir(
    revisaoLeitura,
    'CORRIGIR',
    rascunhoInicial(revisaoLeitura),
    '',
    '',
  );
  const r = f.handle(
    'POST',
    new URL('https://test/api/v1/revisao-operacional/operacoes/' + id),
    body,
  ).data as Parameters<typeof validarRecibo>[0];
  expect(validarRecibo(r, id, body)).toBe(r);
  expect(validarRecibo(r, id)).toBe(r);
  expect(() => validarRecibo(r, 'wrong')).toThrow();
  expect(() => validarRecibo(r, id, { ...body, revisao_id: '102' })).toThrow();
  expect(() => validarRecibo(r, id, { ...body, acao: 'DESCARTAR' })).toThrow();
  expect(() => validarRecibo(undefined, id)).toThrow();
});
it('não inventa stake nem escolha de tipster e não usa descarte para recusar vínculo', () => {
  const draft = rascunhoInicial(revisaoPrint);
  expect(draft.stake_unidades).toBe('');
  expect(() => decidir(revisaoPrint, 'CORRIGIR', draft, '', '')).toThrow(
    /unidades/,
  );
  expect(
    decidir(revisaoPrint, 'CORRIGIR', { ...draft, stake_unidades: '1' }, '', '')
      .aposta_corrigida,
  ).toEqual({ stake_unidades: 1 });
  expect(
    decidir(
      revisaoLeitura,
      'CORRIGIR',
      { ...rascunhoInicial(revisaoLeitura), odd: '2,5' },
      '',
      '',
    ).aposta_corrigida,
  ).toEqual({ odd: 2.5 });
  expect(() => decidir(revisaoPar, 'MESMA', {}, '', '')).toThrow(/tipster/);
  expect(decidir(revisaoPar, 'MESMA', {}, '', 'telegram').tipster_choice).toBe(
    'telegram',
  );
  expect(
    decidir(
      {
        ...revisaoPar,
        par: { ...revisaoPar.par!, escolha_tipster_obrigatoria: false },
      },
      'MESMA',
      {},
      '',
      '',
    ).tipster_choice,
  ).toBeUndefined();
  expect(decidir(revisaoPar, 'RECUSAR_VINCULO', {}, '', '').acao).toBe(
    'RECUSAR_VINCULO',
  );
  expect(() => decidir(revisaoPar, 'DESCARTAR', {}, '', '')).toThrow();
  expect(() =>
    decidir({ ...revisaoLeitura, estado: 'resolvida' }, 'CORRIGIR', {}, '', ''),
  ).toThrow();
  const item = {
    ...revisaoPrint,
    print_odd: null,
    print_casa: null,
    print_descricao: null,
    print_evento: null,
  };
  expect(rascunhoInicial(item)).toMatchObject({
    casa: '',
    evento: '',
    descricao: '',
    odd: '',
    freebet: false,
  });
});
