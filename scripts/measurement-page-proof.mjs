/* global document */
import BFCacheFailures from 'lighthouse/core/gather/gatherers/bf-cache-failures.js';
import defaultConfig from 'lighthouse/core/config/default-config.js';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

export function measurementConfig(profile, proof) {
  // A full official config avoids merging an object gatherer into its original
  // string declaration. Audits/categories remain the complete upstream set.
  return {
    ...defaultConfig,
    settings: {
      ...defaultConfig.settings,
      ...(profile === 'desktop' ? desktopConfig.settings : {}),
    },
    artifacts: defaultConfig.artifacts.map((artifact) =>
      artifact.id === 'BFCacheFailures'
        ? { ...artifact, gatherer: { instance: proof } }
        : artifact,
    ),
  };
}

// Read only booleans at the end of the measured navigation. BFCacheFailures
// subsequently leaves and revisits the page; that later DOM is not this sample.
export function renderedPageProof(heading, expectedBets) {
  const title = document.querySelector('main h1');
  const loading = [...document.querySelectorAll('[role="status"]')].some(
    (node) =>
      node.getClientRects().length > 0 &&
      /^(Abrindo|Carregando|Consultando|Conferindo)/.test(
        node.textContent?.trim() || '',
      ),
  );
  return {
    headingVerified:
      !!title?.getClientRects().length && title.textContent?.trim() === heading,
    settled:
      !loading &&
      !document.querySelector('[aria-busy="true"],main .erro-api') &&
      (expectedBets === undefined ||
        document.querySelectorAll('.aposta-linha').length === expectedBets),
  };
}

export class MeasurementPageProof extends BFCacheFailures {
  constructor(heading, expectedBets) {
    super();
    this.heading = heading;
    this.expectedBets = expectedBets;
  }
  async stopSensitiveInstrumentation(context) {
    this.proof = await context.driver.executionContext.evaluate(
      renderedPageProof,
      {
        args: [this.heading, this.expectedBets],
        useIsolation: true,
      },
    );
  }
  getProof() {
    if (!this.proof) throw new Error('PERFORMANCE_PAGE_NOT_CAPTURED');
    return this.proof;
  }
}
