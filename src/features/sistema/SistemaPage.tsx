import { useState } from 'react';
import { GraficoEvolucao } from '../../components/graficos/GraficoEvolucao';
import { BarrasLucro } from '../../components/graficos/BarrasLucro';
import type {
  PontoEvolucao,
  GrupoLucro,
} from '../../components/graficos/geometria';

// Exemplos estáticos, não derivados de apostas nem usados para decisões financeiras.
const pontos: PontoEvolucao[] = [
  {
    periodo_inicio: '2026-09-01',
    lucro_acumulado_centavos: 0,
    lucro_periodo_centavos: 0,
    banca_id: null,
    banca_nome: null,
    saldo_centavos: null,
  },
  {
    periodo_inicio: '2026-09-03',
    lucro_acumulado_centavos: -12000,
    lucro_periodo_centavos: -12000,
    banca_id: null,
    banca_nome: null,
    saldo_centavos: null,
  },
  {
    periodo_inicio: '2026-09-10',
    lucro_acumulado_centavos: 8000,
    lucro_periodo_centavos: 20000,
    banca_id: null,
    banca_nome: null,
    saldo_centavos: null,
  },
  {
    periodo_inicio: '2026-09-21',
    lucro_acumulado_centavos: 24000,
    lucro_periodo_centavos: 16000,
    banca_id: null,
    banca_nome: null,
    saldo_centavos: null,
  },
  {
    periodo_inicio: '2026-09-29',
    lucro_acumulado_centavos: 18000,
    lucro_periodo_centavos: -6000,
    banca_id: null,
    banca_nome: null,
    saldo_centavos: null,
  },
];
const grupos: GrupoLucro[] = [
  {
    id: 1,
    familia: null,
    nome: 'Grupo Norte',
    metricas: {
      lucro_centavos: 24000,
      total_apostas: 16,
      base_roi_centavos: 0,
      freebets: 0,
      giro_centavos: 0,
      greens: 0,
      pendentes: 0,
      reds: 0,
      retorno_centavos: 0,
      roi: '0',
      roi_basis_points: 0,
      win_rate: '0',
      win_rate_basis_points: 0,
    },
  },
  {
    id: 2,
    familia: null,
    nome: 'Grupo Sul',
    metricas: {
      lucro_centavos: -12000,
      total_apostas: 4,
      base_roi_centavos: 0,
      freebets: 0,
      giro_centavos: 0,
      greens: 0,
      pendentes: 0,
      reds: 0,
      retorno_centavos: 0,
      roi: '0',
      roi_basis_points: 0,
      win_rate: '0',
      win_rate_basis_points: 0,
    },
  },
  {
    id: 3,
    familia: null,
    nome: 'Grupo Centro',
    metricas: {
      lucro_centavos: 6000,
      total_apostas: 9,
      base_roi_centavos: 0,
      freebets: 0,
      giro_centavos: 0,
      greens: 0,
      pendentes: 0,
      reds: 0,
      retorno_centavos: 0,
      roi: '0',
      roi_basis_points: 0,
      win_rate: '0',
      win_rate_basis_points: 0,
    },
  },
];
const CENARIOS = [
  'Comparação',
  'Sem dados',
  'Um ponto',
  'Zero',
  'Extremos',
] as const;
export function SistemaPage() {
  const [cenario, escolher] = useState<(typeof CENARIOS)[number]>('Comparação');
  const serie =
    cenario === 'Sem dados'
      ? []
      : cenario === 'Um ponto'
        ? pontos.slice(2, 3)
        : cenario === 'Zero'
          ? pontos.map((p) => ({ ...p, lucro_acumulado_centavos: 0 }))
          : cenario === 'Extremos'
            ? [
                {
                  ...pontos[0]!,
                  lucro_acumulado_centavos: -Number.MAX_SAFE_INTEGER,
                },
                {
                  ...pontos[4]!,
                  lucro_acumulado_centavos: Number.MAX_SAFE_INTEGER,
                },
              ]
            : pontos;
  const comparacao =
    cenario === 'Sem dados'
      ? []
      : cenario === 'Um ponto'
        ? grupos.slice(0, 1)
        : cenario === 'Zero'
          ? grupos.map((g) => ({
              ...g,
              metricas: { ...g.metricas, lucro_centavos: 0, total_apostas: 0 },
            }))
          : cenario === 'Extremos'
            ? grupos.map((g, i) => ({
                ...g,
                nome: 'Grupo com identificação extensa para conferir a leitura no celular',
                metricas: {
                  ...g.metricas,
                  lucro_centavos:
                    i === 0
                      ? -Number.MAX_SAFE_INTEGER
                      : Number.MAX_SAFE_INTEGER,
                },
              }))
            : grupos;
  return (
    <main>
      <h1>Sistema</h1>
      <p>Gráficos para acompanhar a evolução e comparar resultados.</p>
      <p role="note">
        Demonstração com dados fictícios. Estes valores não representam sua
        conta.
      </p>
      <fieldset className="sistema-cenarios">
        <legend>Cenário da demonstração</legend>
        {CENARIOS.map((nome) => (
          <label key={nome}>
            <input
              type="radio"
              name="cenario"
              value={nome}
              checked={cenario === nome}
              onChange={() => escolher(nome)}
            />
            {nome}
          </label>
        ))}
      </fieldset>
      <div className="sistema-graficos" key={cenario}>
        <GraficoEvolucao
          dados={serie}
          titulo="Evolução do lucro"
          periodo="Setembro de 2026"
        />
        <BarrasLucro
          dados={comparacao}
          titulo="Lucro por grupo"
          periodo="Setembro de 2026"
        />
      </div>
    </main>
  );
}
