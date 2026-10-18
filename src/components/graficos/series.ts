export const SERIES_CAIXA = {
  lucro_acumulado_centavos: 'Lucro acumulado',
  depositos_acumulados_centavos: 'Depósitos acumulados',
  saques_acumulados_centavos: 'Saques acumulados',
  saldo_centavos: 'Saldo',
} as const;
export type SerieCaixa = keyof typeof SERIES_CAIXA;
