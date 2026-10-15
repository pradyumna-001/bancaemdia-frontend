import { ApiError } from '../../api/error';
export function idValido(value: string | null): value is string {
  return (
    !!value &&
    /^[1-9]\d{0,18}$/.test(value) &&
    BigInt(value) <= 9223372036854775807n
  );
}
// OpenAPI declares the path as integer; serialize the validated string directly,
// without rounding identifiers through a JavaScript number.
export function caminhoRevisao(id: string) {
  if (!idValido(id)) throw new ApiError('invalid_request');
  return {
    params: { path: { revisao_id: 1 } },
    pathSerializer: (path: string) => path.replace('{revisao_id}', id),
  };
}
