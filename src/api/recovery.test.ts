import { expect, it } from 'vitest';
import { ApiError } from './error';
import { recuperacaoErro } from './recovery';

it.each([
  [401, 'entrar'],
  [402, 'assinatura'],
  [413, 'revisar'],
  [422, 'revisar'],
  [400, 'revisar'],
  [429, 'tentar'],
  [500, 'tentar'],
  [503, 'tentar'],
] as const)(
  'HTTP %s oferece uma próxima ação sem mostrar resposta crua',
  (status, action) => {
    const result = recuperacaoErro(new ApiError('http', { status }), 'leitura');
    expect(result.action).toBe(action);
    expect(result.description).not.toMatch(/stack|JSON|undefined/);
  },
);
it.each([403, 404, 405])(
  'não sugere reenviar recurso indisponível %s',
  (status) => {
    expect(
      recuperacaoErro(new ApiError('http', { status }), 'leitura').action,
    ).toBeUndefined();
  },
);
it.each(['estado', 'idempotencia', 'previa', undefined] as const)(
  'conflito %s tem ação contextual sem inferir de detalhe cru',
  (conflict) => {
    const model = recuperacaoErro(
      new ApiError('http', { status: 409 }),
      'gravacao',
      conflict,
    );
    expect(model.action).toBe(
      conflict === 'estado'
        ? 'recarregar'
        : conflict === 'previa'
          ? 'previa'
          : 'conferir',
    );
    expect(model.description).not.toContain('Tente novamente');
  },
);
it('preserva filtro recusado e revisão de conflito sem motivo conhecido', () => {
  expect(
    recuperacaoErro(new ApiError('http', { status: 422 }), 'leitura')
      .description,
  ).toContain('filtro válido');
  expect(
    recuperacaoErro(new ApiError('http', { status: 422 }), 'gravacao')
      .description,
  ).toContain('Nenhum valor foi apagado');
  expect(
    recuperacaoErro(new ApiError('http', { status: 409 }), 'leitura').action,
  ).toBe('revisar');
});
it.each(['network', 'timeout', 'invalid_response'] as const)(
  'escrita %s pede conferência, nunca reenvio',
  (kind) => {
    expect(
      recuperacaoErro(new ApiError(kind, { mutation: true }), 'gravacao')
        .action,
    ).toBe('conferir');
  },
);
it('erro inesperado não expõe texto externo nem afirma falha de escrita', () => {
  const model = recuperacaoErro(new Error('PRIVATE_TEST_DATA'), 'gravacao');
  expect(model.description).not.toContain('PRIVATE');
  expect(model.action).toBe('conferir');
  expect(recuperacaoErro(null, 'leitura').action).toBe('tentar');
});
it('cancelamento anterior e pedido inválido não autorizam reenvio automático', () => {
  expect(recuperacaoErro(new ApiError('cancelled'), 'leitura').action).toBe(
    'tentar',
  );
  expect(
    recuperacaoErro(new ApiError('cancelled'), 'gravacao').action,
  ).toBeUndefined();
  expect(
    recuperacaoErro(new ApiError('invalid_request'), 'gravacao').action,
  ).toBe('revisar');
});
