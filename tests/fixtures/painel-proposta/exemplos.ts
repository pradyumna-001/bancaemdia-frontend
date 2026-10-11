// Illustrative design content, not API DTOs, not a contract candidate.
// Totals are independent fixed examples: this fixture proves no reconciliation.
export const grupos = [
  {
    nome: 'Futebol — entradas diárias',
    lucro: 92000,
    apostas: 80,
    tipsters: [
      { nome: 'André', lucro: 120000, apostas: 50 },
      { nome: 'Marina', lucro: -28000, apostas: 30 },
    ],
  },
  {
    nome: 'Basquete ao vivo',
    lucro: -24000,
    apostas: 24,
    tipsters: [
      { nome: 'André', lucro: -33000, apostas: 18 },
      { nome: 'Lucas', lucro: 9000, apostas: 6 },
    ],
  },
  { nome: 'Sem grupo atribuído', lucro: 10000, apostas: 10, tipsters: [] },
];

const amostras = [
  { lucro: 12000, apostas: 8, pendentes: 0, estado: 'Confirmado' },
  { lucro: -8000, apostas: 4, pendentes: 0, estado: 'Confirmado' },
  { lucro: 0, apostas: 2, pendentes: 0, estado: 'Zero confirmado' },
  { lucro: 22000, apostas: 12, pendentes: 0, estado: 'Confirmado' },
  { lucro: -5000, apostas: 3, pendentes: 0, estado: 'Confirmado' },
  { lucro: 6000, apostas: 7, pendentes: 2, estado: '2 pendentes' },
  { lucro: null, apostas: null, pendentes: null, estado: 'Dado ausente' },
  { lucro: -10000, apostas: 8, pendentes: 0, estado: 'Confirmado' },
  { lucro: 14000, apostas: 10, pendentes: 0, estado: 'Confirmado' },
  { lucro: 9000, apostas: 6, pendentes: 0, estado: 'Confirmado' },
  { lucro: 0, apostas: 0, pendentes: 0, estado: 'Sem atividade' },
  { lucro: 4000, apostas: 3, pendentes: 0, estado: 'Confirmado' },
  { lucro: 5000, apostas: 5, pendentes: 0, estado: 'Confirmado' },
  { lucro: 17000, apostas: 11, pendentes: 0, estado: 'Confirmado' },
];
// Calendar generation only; no financial aggregation or cumulative differences.
export const dias = Array.from({ length: 90 }, (_, i) => ({
  data: new Date(Date.UTC(2026, 6, 13 + i)).toISOString().slice(0, 10),
  ...amostras[i % amostras.length]!,
}));
