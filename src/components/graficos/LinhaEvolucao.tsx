import { useLayoutEffect, useRef, useState } from 'react';
import { dataCivil, moeda, moedaEixo } from '../../lib/format';
import { diaCalendario, escalaZero, type PontoEvolucao } from './geometria';
import { SERIES_CAIXA, type SerieCaixa } from './series';

export function LinhaEvolucao({
  pontos,
  serie,
  selecionado,
  selecionar,
  leituraId,
}: {
  pontos: readonly PontoEvolucao[];
  serie: SerieCaixa;
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
  const eixo = escalaZero(
    pontos.flatMap((p) => (p[serie] === null ? [] : [p[serie]!])),
    194,
    48,
  );
  const marcas = [...new Set([eixo.max, 0, eixo.min])];
  const esquerda = Math.max(
    72,
    ...marcas.map((v) => moedaEixo(v).length * 7 + 12),
  );
  const direita = largura - 24;
  const first = diaCalendario(pontos[0]!.periodo_inicio);
  const last = diaCalendario(pontos.at(-1)!.periodo_inicio);
  const x = (p: PontoEvolucao) =>
    first === last
      ? (esquerda + direita) / 2
      : esquerda +
        ((diaCalendario(p.periodo_inicio) - first) / (last - first)) *
          (direita - esquerda);
  const texto = (p: PontoEvolucao) =>
    dataCivil(p.periodo_inicio) +
    ': ' +
    moeda(p[serie], serie === 'lucro_acumulado_centavos');
  const segmentos: PontoEvolucao[][] = [[]];
  for (const p of pontos) {
    if (p[serie] === null) segmentos.push([]);
    else segmentos.at(-1)!.push(p);
  }
  // Apenas geometria de rótulos: suprime colisões, nunca registros da tabela.
  const anotados: PontoEvolucao[] = [];
  const posicaoRotulo = (p: PontoEvolucao) => {
    const meia = Math.max(42, moeda(p[serie], true).length * 4.5);
    const centro = Math.min(largura - meia - 4, Math.max(meia + 4, x(p)));
    return { meia, centro };
  };
  const ultimo = [...pontos].reverse().find((p) => p[serie] !== null)!;
  const colide = (a: PontoEvolucao, b: PontoEvolucao) => {
    const ra = posicaoRotulo(a),
      rb = posicaoRotulo(b);
    return (
      Math.abs(ra.centro - rb.centro) < ra.meia + rb.meia + 8 &&
      Math.abs(eixo.coordenada(a[serie]!) - eixo.coordenada(b[serie]!)) < 22
    );
  };
  // Reserva o último valor antes de preencher os espaços livres.
  for (const p of [ultimo, ...pontos]) {
    if (p[serie] === null) continue;
    if (anotados.some((outro) => colide(p, outro))) continue;
    anotados.push(p);
  }
  const mesmoAno =
    pontos[0]!.periodo_inicio.slice(0, 4) ===
    pontos.at(-1)!.periodo_inicio.slice(0, 4);
  const dataNoEixo = (p: PontoEvolucao) =>
    mesmoAno
      ? dataCivil(p.periodo_inicio).slice(0, 5)
      : dataCivil(p.periodo_inicio);
  const meiaData = mesmoAno ? 22 : 40;
  const xData = (p: PontoEvolucao) =>
    Math.min(largura - meiaData - 4, Math.max(meiaData + 4, x(p)));
  const datas: PontoEvolucao[] = [];
  let limite = -Infinity;
  const fim = pontos.at(-1)!;
  for (const p of pontos) {
    const centro = xData(p);
    if (centro - meiaData < limite) continue;
    if (p !== fim && centro + meiaData + 8 > xData(fim) - meiaData) continue;
    datas.push(p);
    limite = centro + meiaData + 8;
  }
  return (
    <svg
      ref={ref}
      className="evolucao-svg"
      viewBox={'0 0 ' + largura + ' 258'}
      role="group"
      aria-label={
        SERIES_CAIXA[serie] +
        '. Valores em reais no eixo vertical e datas no eixo horizontal.'
      }
    >
      {marcas.map((v) => (
        <g key={v} className="grafico-marca">
          <line
            className={v === 0 ? 'grafico-zero' : 'grafico-grade'}
            x1={esquerda}
            x2={direita}
            y1={eixo.coordenada(v)}
            y2={eixo.coordenada(v)}
          />
          <text
            className="grafico-rotulo"
            x={esquerda - 10}
            y={eixo.coordenada(v)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {moedaEixo(v)}
          </text>
        </g>
      ))}
      {segmentos
        .filter((s) => s.length)
        .map((s, i) => (
          <polyline
            key={i}
            className="grafico-linha"
            points={s
              .map((p) => x(p) + ',' + eixo.coordenada(p[serie]!))
              .join(' ')}
          />
        ))}
      {pontos.map((p, i) =>
        p[serie] === null ? null : (
          <g
            key={p.periodo_inicio}
            className={selecionado === i ? 'ponto-selecionado' : undefined}
          >
            <circle
              className="grafico-ponto"
              cx={x(p)}
              cy={eixo.coordenada(p[serie]!)}
              r="4"
            />
            <circle
              className="grafico-alvo"
              cx={x(p)}
              cy={eixo.coordenada(p[serie]!)}
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
              cx={x(p)}
              cy={eixo.coordenada(p[serie]!)}
              r="7"
              aria-hidden="true"
              pointerEvents="none"
            />
          </g>
        ),
      )}
      {anotados.map((p) => {
        const { centro } = posicaoRotulo(p);
        return (
          <g key={p.periodo_inicio} aria-hidden="true">
            <text
              className="grafico-valor numero"
              x={centro}
              y={eixo.coordenada(p[serie]!) - 15}
              textAnchor="middle"
            >
              {moeda(p[serie], serie === 'lucro_acumulado_centavos')}
            </text>
          </g>
        );
      })}
      {datas.map((p) => (
        <text
          key={p.periodo_inicio}
          className="grafico-rotulo grafico-data"
          x={xData(p)}
          y="224"
          textAnchor="middle"
          aria-hidden="true"
        >
          {dataNoEixo(p)}
        </text>
      ))}
      <text
        className="grafico-rotulo"
        x={(esquerda + direita) / 2}
        y="251"
        textAnchor="middle"
      >
        Início do período
      </text>
    </svg>
  );
}
