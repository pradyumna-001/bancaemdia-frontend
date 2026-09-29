/** Apresentação exata de centavos; nunca aceita números fora da precisão do JSON. */
export function moeda(centavos: number, sinal = false): string {
  if (!Number.isSafeInteger(centavos)) throw new Error('Valor indisponível.');
  const inteiro = BigInt(centavos);
  const absoluto = inteiro < 0n ? -inteiro : inteiro;
  const reais = new Intl.NumberFormat('pt-BR').format(absoluto / 100n);
  const fracao = (absoluto % 100n).toString().padStart(2, '0');
  const prefixo = inteiro < 0n ? '−' : sinal && inteiro > 0n ? '+' : '';
  return `${prefixo}R$ ${reais},${fracao}`;
}

/** Datas civis da API, sem conversão para o fuso local. */
export function dataCivil(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Escala compacta apenas para eixos; resumo e tabela preservam centavos exatos. */
export function moedaEixo(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) throw new Error('Valor indisponível.');
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: Math.abs(centavos) < 100000 ? 2 : 1,
    minimumFractionDigits: 0,
  }).format(centavos / 100);
}
