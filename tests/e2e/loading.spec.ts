import { expect, test } from '@playwright/test';
import { apostaExemplo, resumoExemplo } from '../fixtures/apostas';
import { billingStatus } from '../fixtures/acesso';
import { diario, grupos, legado, filtrado } from '../fixtures/painel';
import { analises, caixaAnalises } from '../fixtures/analises';
import { caixaFixture } from '../fixtures/caixa';
import { createContasFixture } from '../fixtures/contas';
import { filaResultado } from '../fixtures/resultados';
import { unlinkedTelegram } from '../fixtures/telegram';

function gate() {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { ready, release };
}
function watchLayout() {
  const state = {
    supported: PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
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
  await page.addInitScript(watchLayout);
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

for (const [path, ready] of [
  ['/painel', '.painel-resumo'],
  ['/banca', '.caixa-resumo'],
  ['/resultados', '.resultado-atual'],
  ['/contas', '.contas-grid'],
  ['/contas/1', '#contas-cadastro'],
  ['/painel/analises', '.analises-resumo'],
  ['/configuracoes/conexoes', '#telegram-estado'],
])
  test(`consulta inicial de ${path} conserva o titulo e nao desloca a leitura`, async ({
    page,
  }, info) => {
    const data = gate(),
      billing = gate();
    const caixa = caixaFixture(),
      contas = createContasFixture();
    const cors = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Credentials': 'true',
    };
    await page.addInitScript(watchLayout);
    await page.route('http://127.0.0.1:8000/**', async (route) => {
      const url = new URL(route.request().url());
      const p = url.pathname;
      expect(route.request().method()).toBe('GET');
      let json: unknown;
      if (p === '/auth/session')
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
      else if (p === '/api/v1/billing/status') {
        await billing.ready;
        json = billingStatus;
      } else if (p === '/api/v1/revisao/stats')
        json = {
          total: 30,
          por_motivo: { FOTO: 30 },
          mais_antiga_em: null,
          idade_maxima_segundos: 0,
        };
      else {
        await data.ready;
        if (p === '/api/v1/painel/filtrado/diario') json = diario;
        else if (p === '/api/v1/painel/filtrado/grupos') json = grupos;
        else if (p === '/api/v1/painel/filtrado') json = filtrado;
        else if (p === '/api/v1/painel/analises') json = analises;
        else if (p === '/api/v1/painel')
          json = path === '/painel/analises' ? caixaAnalises : legado;
        else if (p === '/api/v1/resultados/fila') json = filaResultado();
        else if (p === '/api/v1/telegram/link') json = unlinkedTelegram;
        else if (
          p.startsWith('/api/v1/caixa') ||
          p.startsWith('/api/v1/casas/')
        )
          json = caixa.handle('GET', url).data;
        else json = contas.handle('GET', url);
        expect(json, p).toBeDefined();
      }
      await route.fulfill({ json, headers: cors });
    });
    try {
      await page.goto(path!);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(
        page.locator('main .consulta-carregando').first(),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const before = await page.locator('main h1').boundingBox();
      await page.screenshot({ path: info.outputPath('consulta.png') });
      data.release();
      billing.release();
      await expect(page.locator(ready!).first()).toBeVisible();
      await expect(page.locator('main .consulta-carregando')).toHaveCount(0);
      await expect(page.locator('main .erro-api')).toHaveCount(0);
      if (path === '/banca') {
        const label = await page
          .locator('.caixa-saldo-controles .filtro-escolha > span')
          .boundingBox();
        const picker = await page
          .getByRole('button', {
            name: 'Saldo até a data Sem limite',
            exact: true,
          })
          .boundingBox();
        expect(label!.y + label!.height).toBeLessThanOrEqual(picker!.y);
      }
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const after = await page.locator('main h1').boundingBox();
      expect(Math.abs(before!.y - after!.y)).toBeLessThanOrEqual(1);
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
      await page.screenshot({ path: info.outputPath('dados.png') });
    } finally {
      data.release();
      billing.release();
    }
  });

// A late billing/queue answer must not move a control the pointer already
// targets: "Confirmar saída" kept the click while a READ_ONLY notice entered.
for (const acesso of ['READ_ONLY', 'erro'] as const)
  test(`aviso tardio de acesso (${acesso}) e de fila nao desloca a confirmacao de saida`, async ({
    page,
  }, info) => {
    const billing = gate(),
      fila = gate();
    const cors = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'X-CSRF-Token',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    let logouts = 0;
    await page.addInitScript(watchLayout);
    await page.route('http://127.0.0.1:8000/**', async (route) => {
      if (route.request().method() === 'OPTIONS')
        return route.fulfill({ status: 204, headers: cors });
      const p = new URL(route.request().url()).pathname;
      if (p === '/auth/session')
        return route.fulfill(
          logouts
            ? {
                status: 401,
                json: { code: 'not_authenticated' },
                headers: cors,
              }
            : {
                json: {
                  usuario_id: 1,
                  nome: 'Sandbox',
                  email: 'sandbox@example.org',
                  session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
                  csrf_token: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
                  refresh_required: false,
                  access_expires_at: '2030-01-01T00:00:00Z',
                  session_expires_at: '2030-01-02T00:00:00Z',
                },
                headers: cors,
              },
        );
      if (p === '/auth/logout') {
        logouts++;
        return route.fulfill({ json: { logged_out: true }, headers: cors });
      }
      if (p === '/api/v1/billing/status') {
        await billing.ready;
        return route.fulfill(
          acesso === 'READ_ONLY'
            ? { json: { ...billingStatus, access: 'READ_ONLY' }, headers: cors }
            : { status: 500, json: { detail: 'PRIVATE' }, headers: cors },
        );
      }
      await fila.ready;
      expect(p).toBe('/api/v1/revisao/stats');
      return route.fulfill({
        status: 500,
        json: { detail: 'PRIVATE' },
        headers: cors,
      });
    });
    const frame = () =>
      page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    const sair = page.getByRole('button', {
      name: 'Confirmar saída',
      exact: true,
    });
    try {
      await page.goto('/sair');
      await expect(sair).toBeEnabled();
      await expect(page.locator('.shell-consulta')).toHaveText(
        'Conferindo acesso e fila…',
      );
      await page.evaluate(() => document.fonts.ready);
      await frame();
      const before = await sair.boundingBox();
      billing.release();
      fila.release();
      const aviso = page.getByRole('region', { name: 'Acesso à conta' });
      await expect(
        aviso.getByRole('heading', {
          name:
            acesso === 'READ_ONLY'
              ? 'Sua conta está em modo de leitura'
              : 'Não foi possível conferir seu acesso',
        }),
      ).toBeVisible();
      await expect(page.locator('.aviso-fila')).toBeVisible();
      await frame();
      const after = await sair.boundingBox();
      expect(Math.abs(before!.x - after!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(before!.y - after!.y)).toBeLessThanOrEqual(1);
      expect(
        await page.evaluate(() =>
          ['.aviso-acesso', '.aviso-fila'].map(
            (selector) =>
              !!(
                document
                  .querySelector('main')!
                  .compareDocumentPosition(document.querySelector(selector)!) &
                Node.DOCUMENT_POSITION_FOLLOWING
              ),
          ),
        ),
      ).toEqual([true, true]);
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
      // The reserved header line keeps the state visible at the top.
      await expect(page.locator('.shell-consulta')).toHaveText(
        acesso === 'READ_ONLY'
          ? 'Conta em modo de leitura'
          : 'Acesso não confirmado',
      );
      await page.screenshot({ path: info.outputPath('avisos.png') });
      await sair.click();
      await expect(
        page.getByRole('heading', { name: 'Entrar', exact: true }),
      ).toBeVisible();
      expect(logouts).toBe(1);
    } finally {
      billing.release();
      fila.release();
    }
  });
