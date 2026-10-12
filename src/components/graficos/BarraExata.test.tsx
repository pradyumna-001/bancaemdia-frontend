import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BarraExata, geometriaExata } from './BarraExata';
it('maps exact large cents to bounded geometry and square-root quantity thickness', () => {
  const shape = geometriaExata(
    ['90071992547409930', '-45035996273704965', null, '0'],
    [100, 25, 0, 0],
  );
  expect(shape[0]).toEqual({ largura: 140, negativo: false, espessura: 22 });
  expect(shape[1]).toEqual({ largura: 70, negativo: true, espessura: 11 });
  expect(shape[2]!.largura).toBe(0);
  expect(geometriaExata(['0', null], [0, 0])[0]!.espessura).toBe(0);
  const view = render(<BarraExata desenho={shape[1]!} />);
  expect(view.container.querySelector('rect')).toHaveAttribute('x', '80');
  view.rerender(<BarraExata desenho={shape[0]!} />);
  expect(view.container.querySelector('rect')).toHaveAttribute('x', '150');
});
