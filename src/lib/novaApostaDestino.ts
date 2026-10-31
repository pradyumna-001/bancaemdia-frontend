/** Explicit new-entry link; preserve filters without reusing an earlier intent. */
export function novaApostaDestino(search: string) {
  const next = new URLSearchParams(search);
  next.delete('manual_intencao');
  return '/aposta/nova' + (next.size ? '?' + next.toString() : '');
}
