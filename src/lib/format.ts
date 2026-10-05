// Formatadores únicos (AGENTS regra 2): centavos → texto. Nunca converter
// centavos para reais fora destes formatadores.

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formataMoeda(centavos: bigint | number): string {
  return moeda.format(Number(centavos) / 100);
}

export function formataData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
