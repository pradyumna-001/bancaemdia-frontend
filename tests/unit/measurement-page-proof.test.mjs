/* global document */
import { afterEach, expect, it, vi } from 'vitest';
import BFCacheFailures from 'lighthouse/core/gather/gatherers/bf-cache-failures.js';
import { initializeConfig } from 'lighthouse/core/config/config.js';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import {
  MeasurementPageProof,
  measurementConfig,
  renderedPageProof,
} from '../../scripts/measurement-page-proof.mjs';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
it.each(['mobile', 'desktop'])(
  'mantem artefatos, auditorias e perfil oficiais: %s',
  async (profile) => {
    const flags = {
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
    };
    const baseline = (
      await initializeConfig(
        'navigation',
        profile === 'desktop' ? desktopConfig : undefined,
        flags,
      )
    ).resolvedConfig;
    const proof = new MeasurementPageProof('Apostas', 100);
    const configured = (
      await initializeConfig(
        'navigation',
        measurementConfig(profile, proof),
        flags,
      )
    ).resolvedConfig;
    expect(configured.artifacts.map((a) => a.id)).toEqual(
      baseline.artifacts.map((a) => a.id),
    );
    expect(configured.settings).toEqual(baseline.settings);
    expect(configured.categories.performance.auditRefs).toEqual(
      baseline.categories.performance.auditRefs,
    );
    expect(configured.audits.map((a) => a.implementation.meta.id)).toEqual(
      baseline.audits.map((a) => a.implementation.meta.id),
    );
    expect(
      configured.artifacts.find((a) => a.id === 'BFCacheFailures').gatherer
        .instance,
    ).toBe(proof);
    expect(
      configured.audits.some((a) => a.implementation.meta.id === 'bf-cache'),
    ).toBe(true);
  },
);
function page(content) {
  document.body.innerHTML = content;
  for (const node of document.querySelectorAll('*'))
    node.getClientRects = () => (node.closest('[hidden]') ? [] : [{}]);
}
it('aprova somente titulo visivel e dados assentados', () => {
  page('<main><h1>Apostas</h1></main>');
  expect(renderedPageProof('Apostas')).toEqual({
    headingVerified: true,
    settled: true,
  });
  expect(renderedPageProof('Caixa').headingVerified).toBe(false);
  page('<main hidden><h1>Apostas</h1></main>');
  expect(renderedPageProof('Apostas').headingVerified).toBe(false);
});
it.each([
  '<p role="status">Carregando resumo…</p>',
  '<p role="status">Conferindo acesso…</p>',
  '<section aria-busy="true"></section>',
  '<section class="erro-api"></section>',
])('recusa estado incompleto: %s', (content) => {
  page('<main><h1>Apostas</h1>' + content + '</main>');
  expect(renderedPageProof('Apostas').settled).toBe(false);
});
it('exige o tamanho real da pagina grande, sem aprovar lista vazia', () => {
  page('<main><h1>Apostas</h1><article class="aposta-linha"></article></main>');
  expect(renderedPageProof('Apostas', 100).settled).toBe(false);
  expect(renderedPageProof('Apostas', 1).settled).toBe(true);
});
it('preserva a prova medida quando a auditoria de cache navega depois', async () => {
  page('<main><h1>Apostas</h1></main>');
  const proof = new MeasurementPageProof('Apostas');
  await proof.stopSensitiveInstrumentation({
    driver: {
      executionContext: {
        evaluate: (work, { args, useIsolation }) => {
          expect(useIsolation).toBe(true);
          return work(...args);
        },
      },
    },
  });
  page('<main><h1>Apostas</h1><p role="status">Carregando…</p></main>');
  expect(renderedPageProof('Apostas').settled).toBe(false);
  expect(proof.getProof()).toEqual({ headingVerified: true, settled: true });
  expect(proof.getArtifact).toBe(BFCacheFailures.prototype.getArtifact);
});
it('nao fabrica prova antes de encerrar a medicao', () => {
  expect(() => new MeasurementPageProof('Apostas').getProof()).toThrow(
    'PERFORMANCE_PAGE_NOT_CAPTURED',
  );
});
