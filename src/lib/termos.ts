// Termos canônicos (AGENTS regra 4). Vocabulário fixo do dono, pt-BR.

export const ABAS_NOMES = {
  apostas: "Apostas",
  painel: "Painel",
  enviar: "Enviar",
  coleta: "Coleta",
  banca: "Banca",
  resultados: "Resultados",
  revisao: "Revisão",
} as const;

export const ESTADOS_APOSTA = [
  "PENDENTE",
  "GREEN",
  "RED",
  "ANULADA",
  "CASHOUT",
  "MEIO_GREEN",
  "MEIO_RED",
] as const;

export type EstadoAposta = (typeof ESTADOS_APOSTA)[number];
