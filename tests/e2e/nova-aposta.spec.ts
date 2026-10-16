import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
const base = 'http://127.0.0.1:4216';
const url = base + '/aposta/nova?casa=7&apagadas=1';
async function fill(page: Page) {
  await page.getByRole('button', { name: /^Casa / }).click();
  await page.getByRole('button', { name: 'Betano', exact: true }).click();
  await page.getByLabel('Odd', { exact: true }).fill('2,35');
  await page.getByLabel('Valor em unidades', { exact: true }).fill('1,5');
}
test('Nova aposta: campos, freebet, teclado, temas, conta e reflow', async ({
  page,
}, info) => {
  const posts: { url: string; body: unknown }[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().includes('/apostas-manuais/')
    )
      posts.push({ url: request.url(), body: request.postDataJSON() });
  });
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Nova aposta', exact: true }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`nova-aposta-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: /^Casa / }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Buscar casa').fill('Betano');
  await modal.getByLabel('Buscar casa').press('Enter');
  expect(posts).toHaveLength(0);
  await modal.getByRole('button', { name: 'Betano', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Casa Betano/ }),
  ).toBeFocused();
  await page.getByLabel('Odd', { exact: true }).fill('2,35');
  await page.getByLabel('Valor em unidades', { exact: true }).fill('1,5');
  await page.getByLabel('Esta aposta é uma freebet').check();
  await page.getByText('Evento e outros detalhes (opcional)').click();
  await page.getByLabel('Evento', { exact: true }).fill('Palmeiras × Santos');
  await page
    .getByLabel('Data/hora do jogo', { exact: true })
    .fill('16/10/2026 19:00-03:00');
  await page.getByRole('button', { name: /^Conta que fez a aposta / }).click();
  await page.getByRole('button', { name: /Principal — Ana/ }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath('nova-aposta-preenchida.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Registrar aposta', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Registro manual confirmado' }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body).toMatchObject({
    freebet: true,
    stake_unidades: 1.5,
    conta_casa_id: '11',
  });
  expect(new URL(page.url()).searchParams.get('manual_intencao')).toBe(
    posts[0]!.url.split('/').at(-1),
  );
  await expect(
    page.getByRole('link', { name: 'Conferir conta na Revisão' }),
  ).toHaveAttribute('href', /casa=7.*apagadas=1.*revisao_item=42/);
});
test('Nova aposta: resposta perdida recupera por GET sem repetir POST', async ({
  page,
}) => {
  let posts = 0;
  await page.route('**/api/v1/apostas-manuais/operacoes/*', async (route) => {
    if (route.request().method() === 'POST') {
      posts++;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.goto(url);
  await fill(page);
  await page
    .getByRole('button', { name: 'Registrar aposta', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
  ).toBeVisible();
  expect(posts).toBe(1);
  await page
    .getByRole('button', { name: 'Consultar registro', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Registro manual confirmado' }),
  ).toBeVisible();
  expect(posts).toBe(1);
});
test('Nova aposta: recusa de conta permite corrigir e reenviar com o mesmo UUID', async ({
  page,
}) => {
  const ids: string[] = [];
  await page.route('**/api/v1/apostas-manuais/operacoes/*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    ids.push(route.request().url().split('/').at(-1)!);
    if (ids.length === 1)
      return route.fulfill({
        status: 422,
        json: {
          detail: 'manual_account_invalid',
          campo: 'conta_casa_id',
          efeito: 'nenhuma_gravacao_neste_pedido',
        },
      });
    await route.continue();
  });
  await page.goto(url);
  await fill(page);
  await page.getByText('Evento e outros detalhes (opcional)').click();
  await page.getByRole('button', { name: /^Conta que fez a aposta / }).click();
  await page.getByRole('button', { name: /Principal — Ana/ }).click();
  await page
    .getByRole('button', { name: 'Registrar aposta', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Confira os dados do pedido',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Odd', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: /^Conta que fez a aposta / }).click();
  await page
    .getByRole('button', { name: 'Atribuir pela data do jogo', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Registrar aposta', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Registro manual confirmado' }),
  ).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
});
test('aplicativo público não aceita sessão da fixture de Nova aposta', async ({
  page,
}) => {
  await page.route('**/config.json', (r) =>
    r.fulfill({ json: { VITE_API_URL: base, VITE_APP_ENV: 'production' } }),
  );
  await page.route('http://127.0.0.1:8000/**', (r) =>
    r.fulfill({
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { code: 'not_authenticated' },
    }),
  );
  await page.goto('http://127.0.0.1:4173/aposta/nova');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Registrar aposta', exact: true }),
  ).toHaveCount(0);
});
