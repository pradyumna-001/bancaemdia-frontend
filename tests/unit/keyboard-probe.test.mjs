/* global document */
import { afterEach, expect, it, vi } from 'vitest';
import { keyboardProbe } from '../../scripts/keyboard-probe.mjs';

const styles = new Map();
function setup(markup) {
  document.body.innerHTML = markup;
  for (const el of document.querySelectorAll('*'))
    el.getClientRects = () => [{ width: 20, height: 20 }];
  vi.stubGlobal('getComputedStyle', (el) => ({
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    outlineStyle: 'none',
    outlineWidth: '0px',
    outlineColor: 'currentColor',
    stroke: 'none',
    strokeWidth: '0px',
    strokeOpacity: '1',
    ...styles.get(el),
  }));
}
function focus(el, visible = true) {
  vi.spyOn(document, 'activeElement', 'get').mockReturnValue(el);
  const native = el.matches.bind(el);
  vi.spyOn(el, 'matches').mockImplementation((selector) =>
    selector === ':focus-visible' ? visible : native(selector),
  );
}
const count = () => keyboardProbe({ scope: 'main', mode: 'count' });
const visible = () => keyboardProbe({ scope: 'main', mode: 'focus' });
afterEach(() => {
  document.body.innerHTML = '';
  styles.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('nao conta campos fechados, inertes ou desabilitados mesmo com caixa de layout', () => {
  setup(
    '<main><a href="/">Voltar</a><details><summary>Consultar</summary><input></details><fieldset disabled><input></fieldset><div inert><button>Oculto</button></div><dialog><button>Fechado</button></dialog></main>',
  );
  expect(count()).toBe(2);
});
it('conta uma parada por grupo de radios e a primeira quando nenhum esta marcado', () => {
  setup(
    '<main><input type="radio" name="a"><input type="radio" name="a" checked><input type="radio" name="a"><input type="radio" name="b"><input type="radio" name="b"></main>',
  );
  expect(count()).toBe(2);
});
it('aceita contorno visivel do controle realmente focado', () => {
  setup('<main><button>Consultar</button></main>');
  const el = document.querySelector('button');
  focus(el);
  styles.set(el, { outlineStyle: 'solid', outlineWidth: '3px' });
  expect(visible()).toBe(true);
});
it('reconhece anel SVG adjacente de tres pixels desenhado para o foco', () => {
  setup(
    '<main><svg><circle class="grafico-alvo" tabindex="0"></circle><circle class="grafico-indicador"></circle></svg></main>',
  );
  focus(document.querySelector('.grafico-alvo'));
  styles.set(document.querySelector('.grafico-indicador'), {
    stroke: 'currentColor',
    strokeWidth: '3px',
  });
  expect(visible()).toBe(true);
});
it.each([
  { strokeOpacity: '0' },
  { opacity: '0' },
  { stroke: 'none' },
  { strokeWidth: '2px' },
])('recusa anel invisivel ou sem distincao de foco: %s', (override) => {
  setup(
    '<main><svg><circle class="grafico-alvo" tabindex="0"></circle><circle class="grafico-indicador"></circle></svg></main>',
  );
  focus(document.querySelector('.grafico-alvo'));
  styles.set(document.querySelector('.grafico-indicador'), {
    stroke: 'currentColor',
    strokeWidth: '3px',
    ...override,
  });
  expect(visible()).toBe(false);
});
it('nao aprova perda de foco para fora da area nem ausencia de focus-visible', () => {
  setup('<button>Fora</button><main><button>Dentro</button></main>');
  const el = document.querySelector('button');
  focus(el);
  styles.set(el, { outlineStyle: 'solid', outlineWidth: '3px' });
  expect(visible()).toBe(false);
  vi.restoreAllMocks();
  focus(document.querySelector('main button'), false);
  expect(visible()).toBe(false);
});
