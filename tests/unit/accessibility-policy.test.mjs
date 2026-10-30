// @vitest-environment node
import { expect, it } from 'vitest';
import {
  API_PIN,
  PROFILES,
  ROUTES,
  inspectAccessibilityReport,
} from '../../scripts/performance-policy.mjs';

function report(browser = 'chromium', profile = 'mobile') {
  return {
    schema: 1,
    frontendSha: 'a'.repeat(40),
    apiSha: API_PIN.commit,
    browser,
    browserVersion: '153.0.0.0',
    profile,
    viewport: PROFILES[profile],
    dataset: { bets: 5037, tipsters: 40, markets: 40, days: 91 },
    samples: ROUTES.flatMap((r) =>
      ['claro', 'escuro'].map((theme) => ({
        route: r.id,
        theme,
        passed: true,
      })),
    ),
    graphAlternatives: 20,
    photoReservedAndFocus: true,
    eventTiming: {
      supported: true,
      trustedClicks: 4,
      entries: 2,
      maxDurationMs: 24,
      thresholdMs: 16,
      throttled: browser === 'chromium',
    },
    productionAuthorized: false,
  };
}

it('aceita inventário completo nos três browsers e dois perfis', () => {
  for (const browser of ['chromium', 'firefox', 'webkit'])
    for (const profile of ['mobile', 'desktop'])
      expect(
        inspectAccessibilityReport(report(browser, profile), {
          expectedHead: 'a'.repeat(40),
        }).samples,
      ).toBe(ROUTES.length * 2);
});

it('observações abaixo de 16 ms são censuradas, nunca convertidas a zero', () => {
  const value = report();
  Object.assign(value.eventTiming, { entries: 0, maxDurationMs: null });
  expect(() => inspectAccessibilityReport(value)).not.toThrow();
  value.eventTiming.maxDurationMs = 0;
  expect(() => inspectAccessibilityReport(value)).toThrow();
});

it.each([
  ['rota ausente', (r) => r.samples.pop()],
  ['duplicata', (r) => (r.samples[1] = r.samples[0])],
  ['skip', (r) => (r.samples[0].passed = false)],
  ['tema ausente', (r) => (r.samples[0].theme = 'sistema')],
  ['snapshot privado', (r) => (r.samples[0].tree = 'private')],
  ['cookie', (r) => (r.cookies = 'private')],
  ['URL', (r) => (r.url = 'private')],
  ['dado pequeno', (r) => (r.dataset.bets = 4999)],
  ['versão API', (r) => (r.apiSha = 'a'.repeat(40))],
  ['viewport', (r) => (r.viewport = { width: 390, height: 800 })],
  ['sem tabela', (r) => (r.graphAlternatives = 0)],
  ['sem reserva de mídia', (r) => (r.photoReservedAndFocus = false)],
  ['clique sintético', (r) => (r.eventTiming.trustedClicks = 0)],
  ['limite de latência', (r) => (r.eventTiming.maxDurationMs = 200)],
  ['latência ausente', (r) => (r.eventTiming.maxDurationMs = null)],
  ['sem Event Timing Chromium', (r) => (r.eventTiming.supported = false)],
  ['rede rápida declarada lenta', (r) => (r.eventTiming.throttled = false)],
  ['nome no relatório', (r) => (r.eventTiming.name = 'private')],
  ['versão browser como texto', (r) => (r.browserVersion = 'private')],
  ['autoriza produção', (r) => (r.productionAuthorized = true)],
])('rejeita %s', (_, mutate) => {
  const value = report();
  mutate(value);
  expect(() => inspectAccessibilityReport(value)).toThrow();
});

it('rejeita sucesso de outro commit', () => {
  expect(() =>
    inspectAccessibilityReport(report(), { expectedHead: 'b'.repeat(40) }),
  ).toThrow();
});
