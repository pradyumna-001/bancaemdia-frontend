import { expect, it } from 'vitest';
import {
  apostaResultado,
  filaResultado,
  reciboResultado,
} from '../../../tests/fixtures/resultados';
import {
  contextoConta,
  identidadeValida,
  pedidoResultado,
  unirFila,
  validarAposta,
  validarFila,
  validarRecibo,
} from './protocol';
it('valida fila, revisão, escopo, null e valores fornecidos, sem reconstruir dinheiro', () => {
  const item = apostaResultado();
  expect(validarFila(filaResultado([item])).data[0]).toBe(item);
  expect(validarAposta(item, item.chave).lucro_centavos).toBeNull();
  expect(contextoConta(item)).toBe('Conta principal');
  expect(contextoConta(apostaResultado({ conta_contexto: null }))).toBe(
    'Conta atribuída',
  );
  expect(
    contextoConta(apostaResultado({ conta_contexto: { apelido: false } })),
  ).toBe('Conta atribuída');
  expect(identidadeValida(null)).toBe(false);
  expect(identidadeValida('inválida')).toBe(false);
});
it.each([
  { revisao: 'errada' },
  { chave: '' },
  { stake_centavos: Number.MAX_SAFE_INTEGER + 1 },
  { odd: Number.NaN },
  { antiguidade: 'inválida' },
])('recusa aposta inválida %j', (changes) =>
  expect(() => validarAposta(apostaResultado(changes))).toThrow(),
);
it('recusa resposta ausente e identidade trocada', () => {
  expect(() => validarAposta(undefined)).toThrow();
  expect(() => validarAposta(apostaResultado(), 'outra')).toThrow();
  expect(() => validarFila(undefined)).toThrow();
  expect(() =>
    validarFila(filaResultado([], { observado_em: 'errado' })),
  ).toThrow();
  expect(() =>
    validarFila(filaResultado([], { fronteira_iniciada_em: 'errado' })),
  ).toThrow();
});
it.each([
  { elegivel: false },
  { estado: 'GREEN' as const },
  { conta_atribuicao: 'UNASSIGNED' as const },
])('fila só contém população publicada %j', (changes) =>
  expect(() =>
    validarFila(filaResultado([apostaResultado(changes)])),
  ).toThrow(),
);
it('recibo confere a identidade, alvo, tipo e chave antes de instalar', () => {
  const id = crypto.randomUUID();
  const item = apostaResultado();
  const receipt = reciboResultado(id);
  expect(validarRecibo(receipt, id)).toBe(receipt);
  expect(
    validarRecibo(receipt, id, { chave: item.chave, tipo: 'result' }),
  ).toBe(receipt);
  expect(() => validarRecibo(undefined, id)).toThrow();
  expect(() => validarRecibo(receipt, crypto.randomUUID())).toThrow();
  expect(() =>
    validarRecibo(receipt, id, { chave: 'outra', tipo: 'result' }),
  ).toThrow();
  expect(() =>
    validarRecibo(receipt, id, { chave: item.chave, tipo: 'undo' }),
  ).toThrow();
  const undo = reciboResultado(id, item, {
    tipo: 'undo',
    operacao_desfeita: 'alvo',
    desfazer_ate: null,
  });
  expect(
    validarRecibo(undo, id, { chave: item.chave, tipo: 'undo', alvo: 'alvo' }),
  ).toBe(undo);
  expect(() =>
    validarRecibo(undo, id, { chave: item.chave, tipo: 'undo', alvo: 'outro' }),
  ).toThrow();
});
it('pedido só formata entrada humana, sem cálculo financeiro', () => {
  const item = apostaResultado();
  expect(pedidoResultado(item, 'GREEN')).toEqual({
    chave: item.chave,
    revisao_esperada: item.revisao,
    estado: 'GREEN',
  });
  expect(pedidoResultado(item, 'CASHOUT', '8,00')).toMatchObject({
    cashout_valor_centavos: 800,
  });
  expect(
    pedidoResultado(item, 'MEIO_GREEN', '', '12,34', '0,12'),
  ).toMatchObject({ retorno_centavos: 1234, comissao_centavos: 12 });
  expect(() => pedidoResultado(item, 'CASHOUT')).toThrow();
  expect(() =>
    pedidoResultado(apostaResultado({ elegivel: false }), 'RED'),
  ).toThrow();
  expect(() =>
    pedidoResultado(apostaResultado({ revisao: '' }), 'RED'),
  ).toThrow();
});
it('upsert por identidade conserva ordem recebida e remove somente confirmações reais', () => {
  const first = apostaResultado();
  const second = apostaResultado({ chave: 'segunda' });
  const updated = { ...second, evento: 'Atualizado' };
  expect(
    unirFila(
      [filaResultado([first, second]), filaResultado([updated])],
      new Set([first.chave]),
    ),
  ).toEqual([updated]);
});
