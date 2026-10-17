import { diaCalendario, escalaZero } from './geometria';
import { dataCivil, moedaEixo } from '../../lib/format';
import type { components } from '../../api/schema';

type Ponto = components['schemas']['EvolucaoSaida'];
export const SERIES_CAIXA = {
  lucro_acumulado_centavos: 'Lucro acumulado',
  depositos_acumulados_centavos: 'Depósitos acumulados',
  saques_acumulados_centavos: 'Saques acumulados',
  saldo_centavos: 'Saldo',
} as const;
export type SerieCaixa = keyof typeof SERIES_CAIXA;
export function LinhaCaixa({
  pontos,
  serie,
}: {
  pontos: readonly Ponto[];
  serie: SerieCaixa;
}) {
  const ordered = [...pontos].sort((a, b) =>
    a.periodo_inicio.localeCompare(b.periodo_inicio),
  );
  const scale = escalaZero(
    ordered.flatMap((p) => (p[serie] === null ? [] : [p[serie]!])),
    160,
    20,
  );
  const first = diaCalendario(ordered[0]!.periodo_inicio),
    last = diaCalendario(ordered.at(-1)!.periodo_inicio);
  const x = (p: Ponto) =>
    last === first
      ? 235
      : 90 + ((diaCalendario(p.periodo_inicio) - first) / (last - first)) * 290;
  const segments: Array<Array<Ponto>> = [];
  for (const p of ordered) {
    if (p[serie] === null) {
      segments.push([]);
      continue;
    }
    if (!segments.length) segments.push([]);
    segments.at(-1)!.push(p);
  }
  return (
    <svg className="analises-linha" viewBox="0 0 410 225" aria-hidden="true">
      {[...new Set([scale.min, 0, scale.max])].map((v) => (
        <g key={v}>
          <line
            className={v === 0 ? 'grafico-zero' : 'grafico-grade'}
            x1="90"
            x2="380"
            y1={scale.coordenada(v)}
            y2={scale.coordenada(v)}
          />
          <text
            className="grafico-rotulo"
            x="80"
            y={scale.coordenada(v)}
            dominantBaseline="middle"
            textAnchor="end"
          >
            {moedaEixo(v)}
          </text>
        </g>
      ))}
      {segments
        .filter((s) => s.length)
        .map((segment, i) => (
          <g key={i}>
            <polyline
              className="grafico-linha"
              points={segment
                .map((p) => `${x(p)},${scale.coordenada(p[serie]!)}`)
                .join(' ')}
            />
            {segment.map((p) => (
              <circle
                className="grafico-ponto"
                key={p.periodo_inicio}
                cx={x(p)}
                cy={scale.coordenada(p[serie]!)}
                r="3.5"
              />
            ))}
          </g>
        ))}
      <text className="grafico-rotulo" x="90" y="195">
        {dataCivil(ordered[0]!.periodo_inicio)}
      </text>
      <text className="grafico-rotulo" x="380" y="215" textAnchor="end">
        {dataCivil(ordered.at(-1)!.periodo_inicio)}
      </text>
    </svg>
  );
}
