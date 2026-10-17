import type { components } from '../../api/schema';
import { SITE_READ_CONTRACT } from '../../api/site-read.generated';
import { respostaPublicada } from '../../api/readContract';
import { ApiError } from '../../api/error';
import { dataHora, moeda, decimal, porcentagem } from '../../lib/format';

export type Titular = components['schemas']['TitularSaida'];
export type Conta = components['schemas']['ContaMatrizSaida'];
export type Financeiro = components['schemas']['FinanceiroSaida'];
export const ESTADOS = {
  DISPONIVEL: 'Disponível',
  EM_USO: 'Em uso',
  LIMITADA: 'Limitada',
  ENCERRADA: 'Encerrada',
} as const;
export function identificador(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}
// All shapes come from the pinned document, including write receipts.
export function validar<T>(value: T | undefined, route: string): T {
  const contract = SITE_READ_CONTRACT as Record<
    string,
    { response?: Parameters<typeof respostaPublicada>[1] }
  >;
  respostaPublicada(value, contract[route]?.response);
  return value!;
}
export function horario(value: string | null): string {
  return value === null
    ? 'Não informado'
    : dataHora(value, 'America/Sao_Paulo');
}
export function contaValidada(value: Conta): Conta {
  if (
    !identificador(String(value.conta_casa_id)) ||
    !identificador(String(value.casa_id))
  )
    throw new ApiError('invalid_response');
  for (const period of value.historico_uso) {
    horario(period.vigente_de);
    horario(period.vigente_ate);
  }
  if (value.intervalo_ativo) {
    horario(value.intervalo_ativo.vigente_de);
    horario(value.intervalo_ativo.vigente_ate);
  }
  return value;
}
const MONEY = {
  lucro_centavos: 'Lucro',
  giro_centavos: 'Giro',
  retorno_centavos: 'Retorno',
  exposicao_aberta_centavos: 'Em jogo',
  depositos_centavos: 'Depósitos',
  saques_centavos: 'Saques',
  bonus_centavos: 'Bônus',
  transferencias_centavos: 'Transferências',
  ajustes_centavos: 'Ajustes',
} as const;
export function metricas(value: Record<string, number | string>) {
  return Object.entries(MONEY)
    .map<{ label: string; value: string }>(([key, label]) => ({
      label,
      value:
        value[key] === undefined
          ? 'Não informado'
          : moeda(value[key], key === 'lucro_centavos'),
    }))
    .concat([
      {
        label: 'Apostas',
        value:
          value.apostas === undefined
            ? 'Não informado'
            : decimal(value.apostas),
      },
      {
        label: 'ROI',
        value:
          value.roi === undefined ? 'Não informado' : porcentagem(value.roi),
      },
    ]);
}
export function financeiroValidado(value: Financeiro): Financeiro {
  try {
    moeda(value.saldo_atual_centavos);
    metricas(value.total);
    metricas(value.nao_atribuidas);
    for (const holder of value.titulares) {
      moeda(holder.saldo_atual_centavos);
      metricas(holder.metricas);
      for (const account of holder.contas) {
        moeda(account.saldo_atual_centavos);
        metricas(account.metricas);
      }
    }
    for (const account of value.contas_sem_titular) {
      moeda(account.saldo_atual_centavos);
      metricas(account.metricas);
    }
    return value;
  } catch {
    throw new ApiError('invalid_response');
  }
}
