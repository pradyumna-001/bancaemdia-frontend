// Only normalized drawing coordinates become Number; original cents stay exact.
export function geometriaExata(
  valores: readonly (string | null)[],
  quantidades: readonly number[],
) {
  const magnitudes = valores.map((v) =>
    v === null ? 0n : BigInt(v) < 0n ? -BigInt(v) : BigInt(v),
  );
  const max = magnitudes.reduce((a, b) => (a > b ? a : b), 0n);
  const n = Math.max(0, ...quantidades);
  return valores.map((v, i) => ({
    largura: max === 0n ? 0 : Number((magnitudes[i]! * 140000n) / max) / 1000,
    negativo: v !== null && BigInt(v) < 0n,
    espessura: n === 0 ? 0 : 22 * Math.sqrt(quantidades[i]! / n),
  }));
}
export function BarraExata({
  desenho,
}: {
  desenho: ReturnType<typeof geometriaExata>[number];
}) {
  return (
    <svg
      className="painel-barra"
      viewBox="0 0 300 30"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="150" x2="150" y1="0" y2="30" />
      <rect
        className={desenho.negativo ? 'perda' : 'lucro'}
        x={desenho.negativo ? 150 - desenho.largura : 150}
        y={15 - desenho.espessura / 2}
        width={desenho.largura}
        height={desenho.espessura}
      />
    </svg>
  );
}
