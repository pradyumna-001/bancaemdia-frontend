// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('mantém os gráficos próprios, sem dependência de biblioteca de gráficos', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const names = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  });
  expect(
    names.filter((name) =>
      /(?:chart|recharts|echarts|highcharts|plotly|^d3(?:-|$)|^@visx\/|^@nivo\/|^vega)/i.test(
        name,
      ),
    ),
  ).toEqual([]);
});
