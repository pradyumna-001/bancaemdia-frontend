import type { components } from '../../api/schema';
import { ApiError } from '../../api/error';
import { dataHora } from '../../lib/format';

export type Installation = components['schemas']['InstallationResponse'];
export type Pairing = components['schemas']['PairingCodeResponse'];
export const LIST = '/api/v1/coleta/installations';
export const PAIR = 'POST /api/v1/coleta/pairing-codes';
export const ROTATE =
  'POST /api/v1/coleta/installations/{instalacao_id}/rotate';
export const REVOKE = 'DELETE /api/v1/coleta/installations/{instalacao_id}';
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const dates = [
  'criado_em',
  'pareado_em',
  'ultimo_uso_em',
  'rotacionado_em',
  'expira_em',
  'revogado_em',
] as const;
const validDate = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const invalid = (): never => {
  throw new ApiError('invalid_response');
};

export const coletaDate = (value: string | null) =>
  dataHora(value, 'America/Sao_Paulo');
export function installations(
  value: Installation[] | undefined,
): Installation[] {
  if (!Array.isArray(value)) return invalid();
  const seen = new Set<string>();
  for (const row of value) {
    if (
      !row ||
      !Number.isSafeInteger(row.id) ||
      row.id <= 0 ||
      !uuid.test(row.instalacao_publica_id) ||
      seen.has(row.instalacao_publica_id)
    )
      return invalid();
    seen.add(row.instalacao_publica_id);
    if (
      ![row.nome_dispositivo, row.token_prefixo].every(
        (v) => v === null || typeof v === 'string',
      )
    )
      return invalid();
    if (
      !validDate(row.criado_em) ||
      !dates.every((key) => row[key] === null || validDate(row[key]))
    )
      return invalid();
    const session = row.sessao_coleta;
    if (row.estado_sessao === 'sem_sessao') {
      if (session !== null) return invalid();
    } else {
      if (
        !session ||
        !uuid.test(session.sessao_id) ||
        !validDate(session.coletar_desde) ||
        !validDate(session.criada_em)
      )
        return invalid();
      if (row.estado_sessao === 'aberta') {
        if (session.selecao !== 'atual' || session.encerrada_em !== null)
          return invalid();
      } else if (
        row.estado_sessao !== 'encerrada' ||
        session.selecao !== 'ultima_encerrada' ||
        !validDate(session.encerrada_em)
      )
        return invalid();
    }
  }
  return value;
}
export function pairing(value: Pairing | undefined): Pairing {
  if (
    !value ||
    !/^cpc_[A-Za-z0-9_-]{32}$/.test(value.codigo) ||
    !validDate(value.expira_em)
  )
    throw new ApiError('invalid_response', { mutation: true });
  return value;
}
export function rotated(
  value: components['schemas']['InstallationTokenResponse'] | undefined,
  id: number,
): string {
  if (
    !value ||
    value.instalacao_id !== id ||
    !/^cti_[A-Za-z0-9_-]{43}$/.test(value.token)
  )
    throw new ApiError('invalid_response', { mutation: true });
  return value.token;
}
export function credential(row: Installation): string {
  if (row.revogado_em) return 'Revogada';
  if (row.expira_em && Date.parse(row.expira_em) <= Date.now())
    return 'Expirada';
  return 'Sem revogação registrada';
}
export function maskedPrefix(value: string | null): string {
  return value ? `${value.slice(0, 12)}••••` : 'Não informado';
}
