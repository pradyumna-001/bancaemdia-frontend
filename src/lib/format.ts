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
