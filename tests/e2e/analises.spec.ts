import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const demo = 'http://127.0.0.1:4222';

test('Evolução densa mantém todas as datas e valores acessíveis sem rótulos sobrepostos', async ({
  page,
}, testInfo) => {
  await page.route('**/api/v1/painel?*', async (route) => {
    const original = await (await route.fetch()).json();
    const pontos = Array.from({ length: 31 }, (_, i) => ({
      ...original.evolucao[0],
      periodo_inicio: '2026-10-' + String(i + 1).padStart(2, '0'),
      lucro_acumulado_centavos: i % 2 === 0 ? 12345 : -9876,
      lucro_periodo_centavos: 777,
    }));
    await route.fulfill({ json: { ...original, evolucao: pontos } });
  });
  await page.goto(demo + '/painel/analises');
  const banca = page.locator('.analises-banca');
  const tabela = banca.locator('.serie-valores');
  await expect(tabela.locator('tbody tr')).toHaveCount(31);
  await expect(tabela.locator('tbody tr').first()).toHaveText(
    '01/10/2026+R$ 7,77+R$ 123,45',
  );
  await expect(tabela.locator('tbody tr').last()).toHaveText(
    '31/10/2026+R$ 7,77+R$ 123,45',
  );
  const rects = await banca.locator('.grafico-data').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    }),
  );
  for (let i = 1; i < rects.length; i++)
    expect(rects[i]!.left).toBeGreaterThan(rects[i - 1]!.right);
  await tabela.focus();
  await page.keyboard.press('End');
  await expect(tabela.locator('tbody tr').last()).toBeInViewport();
  await banca.screenshot({
    path: testInfo.outputPath('evolucao-31-periodos.png'),
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('Análises: comparação aprovada, tabela, recortes, caixa, teclado e temas', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(demo + '/painel/analises?casa=7&apagadas=1');
  const sports = page.locator('#analises-esportes');
  await expect(
    sports.getByText('Futebol', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    sports.getByText('Esporte não informado', { exact: true }).first(),
  ).toBeVisible();
  await expect(sports).toContainText('−R$ 146,00');
  await sports.screenshot({
    path: testInfo.outputPath('analises-esportes.png'),
  });
  const table = sports.locator('details');
  await table.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(table.getByRole('table')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(table.getByRole('table')).not.toBeVisible();
  await page
    .locator('#analises-outros')
    .getByText('Dias da semana e horários', { exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Mapa de dias e horários' }),
  ).toBeVisible();
  if (page.viewportSize()!.width < 700) {
    const mapa = page.getByRole('region', { name: 'Mapa de dias e horários' });
    await mapa.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => mapa.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
  }
  const saldo = page.getByRole('radio', { name: 'Saldo', exact: true });
  const banca = page.locator('.analises-banca').first();
  await expect(banca.getByText('Primeiro registro · 20/09/2026')).toBeVisible();
  await expect(banca.getByText('Acumulado até 10/10/2026')).toBeVisible();
  await expect(banca.locator('.serie-valores table')).toBeVisible();
  await expect(banca.locator('.serie-valores tbody tr')).toHaveText([
    '20/09/2026+R$ 200,00+R$ 200,00',
    '01/10/2026+R$ 180,00+R$ 380,00',
    '10/10/2026+R$ 148,00+R$ 528,00',
  ]);
  await banca.screenshot({
    path: testInfo.outputPath('evolucao-lucro-legivel.png'),
  });
  await saldo.click();
  await expect(saldo).toBeChecked();
  await expect(banca.locator('polyline')).toHaveCount(2);
  await expect(
    page.getByText('Saldo não informado para esta série.'),
  ).toBeVisible();
  for (const detail of await page.locator('.analises-page details').all()) {
    if ((await detail.getAttribute('open')) === null)
      await detail.locator(':scope > summary').click();
  }
  await expect(
    page.getByRole('region', {
      name: 'Tabela de evolução de caixa: Banca principal, banca 1',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', {
      name: 'Tabela de evolução de caixa: sem banca atribuída',
      exact: true,
    }),
  ).toBeVisible();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (t) => (document.documentElement.dataset.tema = t),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`analises-${theme}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('link', { name: 'Voltar ao Painel' }),
  ).toHaveAttribute(
    'href',
    '/painel?casa=7&apagadas=1&caixa_serie=saldo_centavos',
  );
  expect(await page.locator('select,input[type=date]').count()).toBe(0);
  expect(errors).toEqual([]);
});
test('Erros de análises preservam caixa e os filtros, com recuperação explícita', async ({
  page,
}) => {
  await page.route('**/api/v1/painel/analises*', (route) =>
    route.fulfill({
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '70' },
      body: '{}',
    }),
  );
  await page.goto(demo + '/painel/analises?casa=7&apagadas=1');
  await expect(
    page.getByText(
      'O serviço está temporariamente indisponível. Aguarde para tentar novamente.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Banca principal' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Atualizar análises' }),
  ).toBeDisabled();
  expect(page.url()).toContain('apagadas=1');
});
test('Build público mantém a rota protegida mesmo apontando para a fixture', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:8000/auth/session', (route) =>
    route.fulfill({
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { detail: 'not_authenticated' },
    }),
  );
  await page.goto(
    '/painel/analises?casa=7&apagadas=1&fixture=' + encodeURIComponent(demo),
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#analises-esportes')).toHaveCount(0);
});
