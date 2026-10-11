export type InteiroExato = number | bigint | string;
export type DecimalRecebido = number | string;
export const NAO_INFORMADO = 'Não informado';
const indisponivel = () => new Error('Valor indisponível.');

/** Conversão textual de entrada BRL; não decide nenhum valor financeiro. */
export function centavosDaEntrada(valor: string): number {
  const match = /^(0|[1-9]\d*)(?:[,.](\d{1,2}))?$/.exec(valor.trim());
  if (!match) throw indisponivel();
  const inteiro = BigInt(match[1]! + (match[2] ?? '').padEnd(2, '0'));
  if (inteiro > BigInt(Number.MAX_SAFE_INTEGER)) throw indisponivel();
  return Number(inteiro);
}

/** Números JSON já imprecisos são recusados, nunca reconstruídos. */
function inteiroExato(valor: InteiroExato): bigint {
  if (typeof valor === 'number' && Number.isSafeInteger(valor))
    return BigInt(valor);
  if (typeof valor === 'bigint' && valor.toString().length <= 129) return valor;
  if (
    typeof valor === 'string' &&
    valor.length <= 129 &&
    /^-?(?:0|[1-9]\d*)$/.test(valor)
  )
    return BigInt(valor);
  throw indisponivel();
}

/** Unidade menor explícita é apresentação, sem câmbio ou cálculo financeiro. */
export function moedaMenor(
  valor: InteiroExato | null,
  currency: string,
  sinal = false,
  casas?: number,
): string {
  if (valor === null) return NAO_INFORMADO;
  if (!Intl.supportedValuesOf('currency').includes(currency))
    throw indisponivel();
  const formato = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'BRL' ? 'symbol' : 'code',
  });
  const digitos = casas ?? formato.resolvedOptions().maximumFractionDigits!;
  if (!Number.isInteger(digitos) || digitos < 0 || digitos > 4)
    throw indisponivel();
  const inteiro = inteiroExato(valor);
  const absoluto = inteiro < 0n ? -inteiro : inteiro;
  const escala = 10n ** BigInt(digitos);
  const fracao = (absoluto % escala).toString().padStart(digitos, '0');
  const partes = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'BRL' ? 'symbol' : 'code',
    minimumFractionDigits: digitos,
    maximumFractionDigits: digitos,
  }).formatToParts(absoluto / escala);
  const prefixo = inteiro < 0n ? '−' : sinal && inteiro > 0n ? '+' : '';
  return (
    prefixo +
    partes
      .map((p) => (p.type === 'fraction' ? fracao : p.value))
      .join('')
      .replaceAll('\u00a0', ' ')
  );
}

/** Centavos BRL do domínio; zero válido não é ausência. */
export function moeda(centavos: InteiroExato | null, sinal = false): string {
  return moedaMenor(centavos, 'BRL', sinal, 2);
}

/** Preço recebido da API Stripe: cadência e escala não definem um plano local. */
export function precoAssinatura(
  amountMinor: InteiroExato | null,
  currency: string | null,
  frequency: string | null,
): string {
  const cadence =
    frequency === 'MONTHLY'
      ? 'por mês'
      : frequency === 'YEARLY'
        ? 'por ano'
        : undefined;
  if (amountMinor === null || currency === null || !cadence)
    return 'Preço não informado';
  // Escala das cobranças Stripe difere do ISO nestes casos publicados.
  const casas =
    currency === 'ISK' || currency === 'UGX'
      ? 2
      : currency === 'MGA'
        ? 0
        : undefined;
  return `${moedaMenor(amountMinor, currency, false, casas)} ${cadence}`;
}

/** Decimal já decidido pela API. Expansão textual não usa float ou arredondamento. */
function numeroDecimal(
  valor: DecimalRecebido,
  deslocamento = 0,
  minimo = 0,
  sinal = false,
): string {
  if (typeof valor !== 'string' && typeof valor !== 'number')
    throw indisponivel();
  if (
    typeof valor === 'number' &&
    (!Number.isFinite(valor) || Math.abs(valor) > Number.MAX_SAFE_INTEGER)
  )
    throw indisponivel();
  const texto = String(valor);
  const match =
    texto.length <= 256 &&
    /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d{1,3}))?$/.exec(texto);
  if (!match) throw indisponivel();
  const expoente = Number(match[4] ?? 0) + deslocamento;
  if (Math.abs(expoente) > 128) throw indisponivel();
  const digitos = match[2]! + (match[3] ?? '');
  const ponto = match[2]!.length + expoente;
  const inteiro =
    ponto <= 0
      ? '0'
      : digitos.slice(0, ponto) +
        '0'.repeat(Math.max(0, ponto - digitos.length));
  const fracao = (
    ponto <= 0 ? '0'.repeat(-ponto) + digitos : digitos.slice(ponto)
  ).padEnd(minimo, '0');
  const diferenteDeZero = /[1-9]/.test(digitos);
  const prefixo = !diferenteDeZero
    ? ''
    : match[1] === '-'
      ? '−'
      : sinal
        ? '+'
        : '';
  return (
    prefixo +
    new Intl.NumberFormat('pt-BR').format(BigInt(inteiro)) +
    (fracao ? `,${fracao}` : '')
  );
}

export function decimal(valor: DecimalRecebido | null): string {
  return valor === null ? NAO_INFORMADO : numeroDecimal(valor);
}

export function odd(valor: DecimalRecebido | null): string {
  return valor === null ? NAO_INFORMADO : numeroDecimal(valor, 0, 2);
}

/** Razão publicada: 0.125 → 12,5%; não deriva ROI de dinheiro/apostas. */
export function porcentagem(
  razao: DecimalRecebido | null,
  sinal = false,
): string {
  return razao === null
    ? NAO_INFORMADO
    : `${numeroDecimal(razao, 2, 0, sinal)}%`;
}

/** Campo *_basis_points da API: 1250 → 12,50%. */
export function porcentagemPontosBase(
  pontos: InteiroExato | null,
  sinal = false,
): string {
  return pontos === null
    ? NAO_INFORMADO
    : `${numeroDecimal(inteiroExato(pontos).toString(), -2, 2, sinal)}%`;
}

/** Datas civis da API, sem conversão para o fuso local. */
export function dataCivil(data: string | null): string {
  if (data === null) return NAO_INFORMADO;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    data.startsWith('0000') ||
    !Number.isFinite(Date.parse(`${data}T00:00:00Z`)) ||
    new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10) !== data
  )
    throw new Error('Data indisponível.');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Instante com offset e fuso explícitos; nunca usa o fuso implícito do browser. */
export function dataHora(instante: string | null, fuso: string): string {
  if (instante === null) return NAO_INFORMADO;
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      instante,
    ) ||
    !Number.isFinite(Date.parse(instante)) ||
    !fuso
  )
    throw new Error('Data indisponível.');
  dataCivil(instante.slice(0, 10));
  try {
    const formato = new Intl.DateTimeFormat('pt-BR', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    return `${formato.format(new Date(instante))} (${formato.resolvedOptions().timeZone})`;
  } catch {
    throw new Error('Data indisponível.');
  }
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
