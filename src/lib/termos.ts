import type { components } from '../api/schema';

export const TERMOS = {
  painel: 'Painel',
  apostas: 'Apostas',
  revisao: 'Revisão',
  coleta: 'Coleta',
  caixa: 'Caixa',
  resultados: 'Resultados',
  enviar: 'Enviar',
  titular: 'Titular',
  conta: 'Conta',
  banca: 'Banca',
  assinatura: 'Assinatura',
  face: 'Valor de face',
  custo: 'Custo próprio',
  retorno: 'Retorno',
  lucro: 'Lucro',
  saldo: 'Saldo',
  odd: 'Odd',
  porcentagem: 'Porcentagem',
} as const;

// Vocabulário de apresentação; os estados de domínio vêm do OpenAPI.
export const ESTADOS_APOSTA = {
  PENDENTE: 'Pendente',
  GREEN: 'Green',
  RED: 'Red',
  ANULADA: 'Anulada',
  CASHOUT: 'Cashout',
  MEIO_GREEN: 'Meio green',
  MEIO_RED: 'Meio red',
} as const satisfies Record<
  components['schemas']['Resultado']['estado'],
  string
>;

export function rotuloEstado(estado: string | null): string {
  return estado !== null && Object.hasOwn(ESTADOS_APOSTA, estado)
    ? ESTADOS_APOSTA[estado as keyof typeof ESTADOS_APOSTA]
    : 'Estado desconhecido';
}
