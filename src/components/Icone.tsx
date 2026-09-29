const desenhos = {
  apostas: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6',
  painel: 'M4 20V4m0 16h16M8 16v-4m4 4V8m4 8V5',
  enviar: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  coleta: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  caixa: 'M3 6h18v14H3V6Zm0 0 14-3v3m-3 6h7v5h-7v-5Z',
  resultados: 'm4 6 2 2 4-4m-6 9 2 2 4-4m-6 9 2 2 4-4m3-11h7m-7 7h7m-7 7h7',
  revisao: 'M7 3h10v3H7V3Zm0 2H4v16h16V5h-3m-9 9 3 3 5-6',
  mais: 'M5 6h14M5 12h14M5 18h14',
  configuracoes: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  fechar: 'm6 6 12 12M6 18 18 6',
} as const;

export type NomeIcone = keyof typeof desenhos;
export const NOMES_ICONES = Object.keys(desenhos) as NomeIcone[];

export function Icone({ nome }: { nome: NomeIcone }) {
  if (!Object.hasOwn(desenhos, nome)) throw new Error('Ícone não registrado.');
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={desenhos[nome]} />
    </svg>
  );
}
