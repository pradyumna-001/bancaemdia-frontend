import { useLayoutEffect, useRef, useState } from 'react';
import { dataCivil, moeda, moedaEixo } from '../../lib/format';
import type { evolucao } from './geometria';

export function LinhaEvolucao({
  pontos,
  eixo,
  selecionado,
  selecionar,
  leituraId,
}: ReturnType<typeof evolucao> & {
  selecionado: number | null;
  selecionar: (indice: number | null) => void;
  leituraId: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [largura, ajustar] = useState(320);
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0)
        ajustar(entry.contentRect.width);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const marcas = [...new Set([eixo.max, 0, eixo.min])];
  const esquerda = Math.max(
    70,
    ...marcas.map((valor) => moedaEixo(valor).length * 7 + 12),
  );
  const direita = largura - 24;
  const x = (valor: number) =>
    esquerda + ((valor - 40) / 240) * (direita - esquerda);
  const y = (valor: number) => 28 + ((valor - 40) / 120) * 170;
  const texto = (p: (typeof pontos)[number]) =>
    `${dataCivil(p.dado.periodo_inicio)}: ${moeda(p.dado.lucro_acumulado_centavos, true)}`;
  const datas = pontos.reduce<typeof pontos>((rotulos, p, i) => {
    const posicao = x(p.x);
    const anterior = rotulos.at(-1);
    const ultimoRotulo = anterior ? x(anterior.x) : -Infinity;
    if (
      i === 0 ||
      i === pontos.length - 1 ||
      (posicao - ultimoRotulo >= 56 && direita - posicao >= 56)
    )
      return [...rotulos, p];
    return rotulos;
  }, []);
  return (
    <svg
      ref={ref}
      className="evolucao-svg"
      viewBox={`0 0 ${largura} 258`}
      role="group"
      aria-label="Evolução do lucro acumulado. Valores em reais no eixo vertical e datas no eixo horizontal."
    >
      {marcas.map((valor) => (
        <g key={valor} className="grafico-marca">
          <line
            className={valor === 0 ? 'grafico-zero' : 'grafico-grade'}
            x1={esquerda}
            x2={direita}
            y1={y(eixo.coordenada(valor))}
            y2={y(eixo.coordenada(valor))}
          />
          <text
            className="grafico-rotulo"
            x={esquerda - 10}
            y={y(eixo.coordenada(valor))}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {moedaEixo(valor)}
          </text>
        </g>
      ))}
      <polyline
        className="grafico-linha"
        points={pontos.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')}
      />
      {pontos.map((p, i) => (
        <g
          key={p.dado.periodo_inicio}
          className={selecionado === i ? 'ponto-selecionado' : undefined}
        >
          <circle className="grafico-ponto" cx={x(p.x)} cy={y(p.y)} r="3.5" />
          <circle
            className="grafico-alvo"
            cx={x(p.x)}
            cy={y(p.y)}
            r="22.5"
            tabIndex={0}
            role="button"
            aria-label={texto(p)}
            aria-describedby={selecionado === i ? leituraId : undefined}
            onFocus={() => selecionar(i)}
            onBlur={() => selecionar(null)}
            onMouseEnter={() => selecionar(i)}
            onClick={() => selecionar(i)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') selecionar(null);
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selecionar(i);
              }
            }}
          />
          <circle
            className="grafico-indicador"
            cx={x(p.x)}
            cy={y(p.y)}
            r="7"
            aria-hidden="true"
            pointerEvents="none"
          />
        </g>
      ))}
      {datas.map((p, i) => (
        <text
          key={p.dado.periodo_inicio}
          className="grafico-rotulo grafico-data"
          x={x(p.x)}
          y="224"
          textAnchor={
            datas.length === 1
              ? 'middle'
              : i === 0
                ? 'start'
                : i === datas.length - 1
                  ? 'end'
                  : 'middle'
          }
        >
          {dataCivil(p.dado.periodo_inicio).slice(0, 5)}
        </text>
      ))}
      <text
        className="grafico-rotulo"
        x={(esquerda + direita) / 2}
        y="251"
        textAnchor="middle"
      >
        Data
      </text>
    </svg>
  );
}
