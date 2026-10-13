import { describe, expect, it } from 'vitest';
import { SITE_READ_CONTRACT } from '../../../api/site-read.generated';
import {
  detalheExemplo,
  revisaoDePar,
} from '../../../../tests/fixtures/detalhe';
import { centavosDaEntrada } from '../../../lib/format';
import {
  dataParaEntrada,
  eventoApresentacao,
  parceiraDaRevisao,
  pedidoCorrecao,
  pedidoResultado,
  validarDetalhe,
  validarMudanca,
  valoresIniciais,
} from './protocol';

describe('correção contratada, sem finanças locais', () => {
  it('preserva campo omitido, limpa somente textos/datas e não edita lucro', () => {
    const initial = valoresIniciais(detalheExemplo);
    expect(
      pedidoCorrecao(
        {
          ...initial,
          evento: 'Evento corrigido',
          descricao: '',
          data_jogo: '',
        },
        initial,
      ),
    ).toEqual({ evento: 'Evento corrigido', descricao: null, data_jogo: null });
    expect(pedidoCorrecao(initial, initial)).toEqual({});
    expect(pedidoCorrecao({ lucro_centavos: '900' } as never, {})).toEqual({});
  });
  it('envia unidades/odd/face como entrada, comissão em centavos exatos', () => {
    expect(
      pedidoCorrecao(
        {
          odd: '2,75',
          stake_unidades: '1,5',
          freebet: true,
          comissao_centavos: '12,34',
        },
        { freebet: false },
      ),
    ).toEqual({
      odd: 2.75,
      stake_unidades: 1.5,
      freebet: true,
      comissao_centavos: 1234,
    });
    expect(
      pedidoCorrecao(
        { freebet: false, comissao_centavos: '' },
        { freebet: true },
      ),
    ).toEqual({ freebet: false });
  });
  it.each(['', '0', '-1', 'Infinity', 'NaN', '1.2.3', '2e999', '1001', '1,00'])(
    'recusa odd inválida %s',
    (value) => expect(() => pedidoCorrecao({ odd: value }, {})).toThrow(),
  );
  it('datas com fuso preservam instante e recusam datas civis impossíveis', () => {
    expect(dataParaEntrada(null)).toBe('');
    expect(dataParaEntrada('2026-10-10T21:00:00-03:00')).toBe(
      '10/10/2026 21:00:00-03:00',
    );
    expect(pedidoCorrecao({ data_jogo: '10/10/2026 21:00-03:00' }, {})).toEqual(
      { data_jogo: '2026-10-10T21:00:00-03:00' },
    );
    for (const value of [
      '2026-10-10',
      '31/02/2026 21:00-03:00',
      '10/10/2026 25:00Z',
      '10/10/2026 21:00',
    ])
      expect(() => pedidoCorrecao({ data_jogo: value }, {})).toThrow();
    expect(
      valoresIniciais({
        ...detalheExemplo,
        aposta: {
          ...detalheExemplo.aposta,
          odd: null,
          data_jogo: null,
          evento: null,
          descricao: null,
          casa: null,
        },
        selecoes: { ...detalheExemplo.selecoes, mercado: null },
      }).odd,
    ).toBe('');
  });
  it('resultado dedicado não fabrica retorno; cashout exige o pagamento da casa', () => {
    expect(pedidoResultado('GREEN', '')).toEqual({ estado: 'GREEN' });
    expect(pedidoResultado('CASHOUT', '0,01')).toEqual({
      estado: 'CASHOUT',
      cashout_valor_centavos: 1,
    });
    expect(() => pedidoResultado('DESCONHECIDO', '')).toThrow();
    expect(() => pedidoResultado('CASHOUT', '')).toThrow();
  });
  it('conversão de moeda não usa float nem aceita precisão perdida', () => {
    expect(centavosDaEntrada('0')).toBe(0);
    expect(centavosDaEntrada('123456789,99')).toBe(12345678999);
    expect(centavosDaEntrada('0.1')).toBe(10);
    for (const value of [
      '-1',
      '1,234',
      '1.000,00',
      '90071992547409,92',
      '1e4',
      'abc',
    ])
      expect(() => centavosDaEntrada(value)).toThrow();
  });
  it('valida resposta da mesma chave e da operação gerada', () => {
    expect(
      validarDetalhe(detalheExemplo, 'exemplo-1', SITE_READ_CONTRACT),
    ).toBe(detalheExemplo);
    expect(() =>
      validarDetalhe(undefined, 'exemplo-1', SITE_READ_CONTRACT),
    ).toThrow();
    expect(() =>
      validarDetalhe(detalheExemplo, 'outra', SITE_READ_CONTRACT),
    ).toThrow();
    expect(() => validarDetalhe(detalheExemplo, 'exemplo-1', {})).toThrow();
    validarMudanca(
      { aposta: detalheExemplo.aposta, eventos_gravados: 1 },
      'exemplo-1',
      'PATCH /api/v1/apostas/{chave}',
      SITE_READ_CONTRACT,
    );
    expect(() =>
      validarMudanca(
        { aposta: detalheExemplo.aposta, eventos_gravados: 1 },
        'outra',
        'PATCH /api/v1/apostas/{chave}',
        SITE_READ_CONTRACT,
      ),
    ).toThrow();
    expect(() =>
      validarMudanca(
        {},
        'exemplo-1',
        'PATCH /api/v1/apostas/{chave}',
        SITE_READ_CONTRACT,
      ),
    ).toThrow();
  });
  it('histórico traduz somente campos conhecidos, sem payload ou segredo', () => {
    const event = eventoApresentacao({
      tipo: 'CORRECAO_MANUAL',
      fonte: 'manual',
      criado_em: null,
      confianca: null,
      payload: {
        evento: 'Jogo',
        descricao: null,
        retorno_centavos: 101,
        stake_centavos: null,
        comissao_centavos: 9007199254740992,
        odd: 2,
        stake_unidades: 1,
        estado: 'RED',
        segredo: 'nunca-mostrar',
        extra: { nested: 'oculto' },
      },
    });
    expect(event.titulo).toBe('Correção manual');
    expect(event.campos).toContainEqual({ label: 'Retorno', value: 'R$ 1,01' });
    expect(event.campos).toContainEqual({
      label: 'Comissão',
      value: 'Não informado',
    });
    expect(JSON.stringify(event)).not.toMatch(/nunca-mostrar|oculto|segredo/);
    expect(
      eventoApresentacao({
        ...detalheExemplo.eventos[0]!,
        tipo: 'TIPO_NOVO',
        fonte: 'novo',
      }).titulo,
    ).toBe('Atualização registrada');
    expect(
      eventoApresentacao({ ...detalheExemplo.eventos[0]!, fonte: 'extensao' })
        .origem,
    ).toBe('Coleta');
  });
  it('só oferece par publicado, nunca inferido de hash', () => {
    expect(parceiraDaRevisao(revisaoDePar)).toBe('exemplo-2');
    expect(parceiraDaRevisao(undefined)).toBeUndefined();
    expect(
      parceiraDaRevisao({
        ...revisaoDePar,
        extracao_bruta: { parceira_suspeita: 99 },
      }),
    ).toBeUndefined();
    expect(
      parceiraDaRevisao({
        ...revisaoDePar,
        extracao_bruta: { parceira_suspeita: ' ' },
      }),
    ).toBeUndefined();
  });
});
