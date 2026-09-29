import type { components } from '../../api/schema';

export type PontoEvolucao = components['schemas']['EvolucaoSaida'];
export type GrupoLucro = components['schemas']['GrupoSaida'];
const DIA = 86_400_000;

function inteiro(valor: number) {
  if (!Number.isSafeInteger(valor))
    throw new Error('Dados fora da precisão suportada.');
}

export function diaCalendario(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data inválida.');
  const instante = Date.parse(`${data}T00:00:00Z`);
  if (
    !Number.isFinite(instante) ||
    new Date(instante).toISOString().slice(0, 10) !== data
  )
    throw new Error('Data inválida.');
  return instante / DIA;
}

/** Escala exclusivamente geométrica. Inclui zero e não altera dados financeiros. */
export function escalaZero(
  valores: readonly number[],
  inicio: number,
  fim: number,
) {
  valores.forEach(inteiro);
  const min = valores.reduce((a, b) => Math.min(a, b), 0);
  const max = valores.reduce((a, b) => Math.max(a, b), 0);
  const coordenada = (valor: number) => {
    inteiro(valor);
    return min === max
      ? (inicio + fim) / 2
      : inicio + ((valor - min) / (max - min)) * (fim - inicio);
  };
  return { min, max, coordenada, zero: coordenada(0) };
}

export function evolucao(dados: readonly PontoEvolucao[]) {
  if (new Set(dados.map((p) => p.banca_id)).size > 1)
    throw new Error('Selecione uma única série para comparar.');
  const ordenados = dados
    .map((dado) => ({ dado, dia: diaCalendario(dado.periodo_inicio) }))
    .sort((a, b) => a.dia - b.dia);
  if (new Set(ordenados.map((p) => p.dia)).size !== ordenados.length)
    throw new Error('Há datas repetidas nesta série.');
  const eixo = escalaZero(
    ordenados.map((p) => p.dado.lucro_acumulado_centavos),
    160,
    40,
  );
  const primeiro = ordenados[0]?.dia ?? 0;
  const ultimo = ordenados.at(-1)?.dia ?? primeiro;
  const pontos = ordenados.map(({ dado, dia }) => ({
    dado,
    x:
      ultimo === primeiro
        ? 160
        : 40 + ((dia - primeiro) / (ultimo - primeiro)) * 240,
    y: eixo.coordenada(dado.lucro_acumulado_centavos),
  }));
  return { eixo, pontos };
}

export function barras(dados: readonly GrupoLucro[]) {
  dados.forEach((dado) => {
    inteiro(dado.metricas.total_apostas);
    if (dado.metricas.total_apostas < 0)
      throw new Error('Quantidade inválida.');
  });
  const eixo = escalaZero(
    dados.map((d) => d.metricas.lucro_centavos),
    8,
    292,
  );
  const maxN = dados.reduce(
    (max, d) => Math.max(max, d.metricas.total_apostas),
    0,
  );
  return {
    eixo,
    itens: dados.map((dado) => {
      const fim = eixo.coordenada(dado.metricas.lucro_centavos);
      return {
        dado,
        x: Math.min(eixo.zero, fim),
        largura: Math.abs(fim - eixo.zero),
        // A constante é compartilhada por toda a série: espessura ∝ √n, sem piso artificial.
        espessura:
          maxN === 0 ? 0 : 24 * Math.sqrt(dado.metricas.total_apostas / maxN),
      };
    }),
  };
}
