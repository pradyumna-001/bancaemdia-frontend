import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const demo = 'http://127.0.0.1:4181';
test('Painel mantém valores, hierarquia, URL, Excel e leitura nos dois tamanhos', async ({
  page,
}, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto(demo + '/painel?grupo=1&apagadas=todas');
  await expect(
    page.getByRole('heading', { name: 'Painel', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Seleções de futebol', { exact: true }),
  ).toBeVisible();
  const group = page.locator('.painel-grupos details').first();
  await group.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(
    group.getByText('Análise do Rafael', { exact: true }),
  ).toBeVisible();
  await expect(
    group.getByText('Linha da Marina', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.painel-dias > li')).toHaveCount(14);
  await page.screenshot({
    path: testInfo.outputPath('painel.png'),
    fullPage: true,
  });
  await expect(
    page.getByText('Resultado pendente · 12 apostas').first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Próximos dias' }).click();
  await expect(page).toHaveURL(/diario_inicio=2026-01-15/);
  await expect(page.locator('.painel-dias > li time').first()).toHaveText(
    '15/01/2026',
  );
  await page.getByRole('button', { name: '90 dias' }).click();
  await expect(page.locator('.painel-dias > li')).toHaveCount(90);
  await expect(page.locator('.painel-dias > li time').last()).toHaveText(
    '31/03/2026',
  );
  await page.getByText('Ver dados diários em tabela', { exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Lucro por dia · BRL' }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Painel em Excel' }).click();
  expect((await download).suggestedFilename()).toBe('painel.xlsx');
  await expect(page.getByText(/Excel pronto para baixar/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(failures).toEqual([]);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('seção indisponível preserva outras leituras e filtro; build público não aceita a sessão da demonstração', async ({
  page,
}) => {
  await page.route('**/api/v1/painel/filtrado/diario*', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  );
  await page.goto(demo + '/painel?grupo=7&apagadas=1');
  await expect(
    page.getByText('Não encontramos o que você procurou.'),
  ).toBeVisible();
  await expect(
    page.getByText('Saldo total ainda não confirmado'),
  ).toBeVisible();
  await expect(page).toHaveURL(/grupo=7/);
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toHaveCount(0);
  await page.goto(
    'http://127.0.0.1:4173/painel?VITE_API_URL=' + encodeURIComponent(demo),
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
});
