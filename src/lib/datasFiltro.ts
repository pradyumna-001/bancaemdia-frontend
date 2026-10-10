export const FUSO_FILTROS = 'America/Sao_Paulo';
const civil = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_FILTROS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  era: 'short',
});
export function diaCivil(instant: Date): string {
  const parts = civil.formatToParts(instant);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return (
    (part('era') === 'BC' ? '0000' : part('year').padStart(4, '0')) +
    '-' +
    part('month') +
    '-' +
    part('day')
  );
}
export function diaValido(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return false;
  const date = new Date(value + 'T12:00:00Z');
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function deslocarDia(day: string, offset: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().split('T')[0]!;
}
// Find the first real instant of a civil day, including historical midnight DST gaps.
// Dates are monotonic in this zone. Never assume a civil day lasts 24 hours.
export function inicioDia(day: string): string {
  if (!diaValido(day)) throw new RangeError('Data inválida.');
  const noon = Date.parse(day + 'T12:00:00Z') / 1000;
  let low = noon - 48 * 3600;
  let high = noon + 48 * 3600;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (
      Number(diaCivil(new Date(middle * 1000)).replaceAll('-', '')) <
      Number(day.replaceAll('-', ''))
    )
      low = middle + 1;
    else high = middle;
  }
  return new Date(low * 1000).toISOString();
}
