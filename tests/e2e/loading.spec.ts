import { expect, test } from '@playwright/test';
import { apostaExemplo, resumoExemplo } from '../fixtures/apostas';
import { billingStatus } from '../fixtures/acesso';

function gate() {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { ready, release };
}

test('respostas independentes preservam a posicao da leitura e o espaco do resumo', async ({
  page,
}, info) => {
  const billing = gate(),
    list = gate(),
    summary = gate();
  const cors = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
    'Access-Control-Allow-Credentials': 'true',
  };
  await page.addInitScript(() => {
    const state = {
      supported:
        PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
      value: 0,
    };
    Object.defineProperty(window, '__loadingStability', { value: state });
    if (state.supported)
      new PerformanceObserver((entries) => {
        for (const event of entries.getEntries()) {
          const shift = event as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) state.value += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route('http://127.0.0.1:8000/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown;
    if (path === '/auth/session')
      json = {
        usuario_id: 1,
        nome: 'Sandbox',
        email: 'sandbox@example.org',
        session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
        csrf_token: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        refresh_required: false,
        access_expires_at: '2030-01-01T00:00:00Z',
        session_expires_at: '2030-01-02T00:00:00Z',
      };
    else if (path === '/api/v1/billing/status') {
      await billing.ready;
      json = billingStatus;
    } else if (path === '/api/v1/apostas') {
      await list.ready;
      json = {
        data: Array.from({ length: 100 }, (_, i) => ({
          ...apostaExemplo,
          chave: 'loading-' + i,
        })),
        pagination: { page: 1, page_size: 100, total: 5000 },
      };
    } else if (path.startsWith('/api/v1/painel')) {
      await summary.ready;
      json = {
        ...resumoExemplo,
        resumo: {
          ...resumoExemplo.resumo,
          total_apostas: 5000,
          roi: '0.1234567890123456789012345678',
        },
      };
    } else
      json = {
        total: 30,
        por_motivo: { FOTO: 30 },
        mais_antiga_em: null,
        idade_maxima_segundos: 0,
      };
    await route.fulfill({ json, headers: cors });
  });
  const geometry = () =>
    page
      .locator('main h1,.apostas-resumo,.apostas-lista-cabecalho')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, height: rect.height };
        }),
      );
  const frame = () =>
    page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  try {
    await page.goto('/?periodo=all&page_size=100');
    await expect(
      page.getByRole('heading', { name: 'Apostas', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.apostas-resumo')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await frame();
    const before = await geometry();
    await expect(page.locator('.apostas-lista')).toHaveClass(
      /apostas-lista--carregando/,
    );
    expect(before).toHaveLength(3);
    await page.screenshot({ path: info.outputPath('carregando.png') });
    list.release();
    await expect(page.getByRole('article')).toHaveCount(100);
    await expect(page.locator('.apostas-lista')).not.toHaveClass(
      /apostas-lista--carregando/,
    );
    billing.release();
    await expect(page.locator('.shell-consulta')).toBeEmpty();
    summary.release();
    await expect(page.locator('.apostas-resumo')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(page.locator('.apostas-indicadores')).toContainText(
      '12,34567890123456789012345678%',
    );
    await frame();
    const after = await geometry();
    for (let i = 0; i < before.length; i++) {
      expect(Math.abs(before[i]!.top - after[i]!.top)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(before[i]!.height - after[i]!.height),
      ).toBeLessThanOrEqual(1);
    }
    const timing = await page.evaluate(
      () =>
        (
          window as unknown as {
            __loadingStability: { supported: boolean; value: number };
          }
        ).__loadingStability,
    );
    if (info.project.name.startsWith('chromium'))
      expect(timing.supported).toBe(true);
    if (timing.supported) expect(timing.value).toBeLessThan(0.1);
    await page.screenshot({ path: info.outputPath('carregado.png') });
    await info.attach('loading-stability', {
      body: JSON.stringify({
        profile: info.project.name,
        clsSupported: timing.supported,
        cls: timing.supported ? timing.value : null,
      }),
      contentType: 'application/json',
    });
  } finally {
    billing.release();
    list.release();
    summary.release();
  }
});
