import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { billingStatus } from '../fixtures/acesso';
import { inicioResposta } from '../fixtures/inicio';
const demo = process.env.INICIO_DEMO_URL ?? 'http://127.0.0.1:4227';
test('build público não aceita a sessão da origem de demonstração', async ({
  page,
}) => {
  await page.goto(demo + '/inicio');
  await expect(
    page.getByRole('heading', { name: 'Prepare a conta da casa' }),
  ).toBeVisible();
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { VITE_API_URL: demo } }),
  );
  await page.goto('http://127.0.0.1:4173/inicio?session=true&fixture=1');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login\?destino=/);
  await expect(
    page.getByRole('heading', { name: 'Primeiro uso', exact: true }),
  ).toHaveCount(0);
});
for (const theme of ['claro', 'escuro']) {
  test(
    'guia opcional tem hierarquia, teclado e reflow: ' + theme,
    async ({ page }, info) => {
      const mutations: string[] = [];
      page.on('request', (r) => {
        if (
          ['POST', 'PATCH', 'DELETE'].includes(r.method()) &&
          r.url().includes('/api/')
        )
          mutations.push(r.method());
      });
      await page.goto(demo + '/inicio?casa=7&apagadas=1');
      await expect(
        page.getByRole('heading', { name: 'Prepare a conta da casa' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Abrir Nova aposta' }),
      ).toHaveAttribute('href', '/aposta/nova?casa=7&apagadas=1');
      await page.evaluate(async (value) => {
        document.documentElement.dataset.tema = value;
        await document.fonts.ready;
        window.scrollTo(0, 0);
      }, theme);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: info.outputPath('inicio-' + theme + '.png'),
        fullPage: true,
      });
      const details = page.getByText('Entenda titular e conta da casa', {
        exact: true,
      });
      await details.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByText(
          'Você ainda não cadastrou titulares. Ainda não há contas da casa cadastradas.',
        ),
      ).toBeVisible();
      await page.setViewportSize({ width: 320, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const consult = page.getByRole('button', {
        name: 'Conferir meus registros',
      });
      await consult.focus();
      await page.keyboard.press('Enter');
      await expect(consult).toBeEnabled();
      expect(mutations).toEqual([]);
      expect(await page.locator('select,input[type=date]').count()).toBe(0);
    },
  );
}
test('canal indisponível tem alternativa e volta ao guia sem perder filtros', async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (
      ['POST', 'PATCH', 'DELETE'].includes(request.method()) &&
      request.url().includes('/api/')
    )
      mutations.push(request.method());
  });
  await page.goto(demo + '/inicio?casa=7&apagadas=1');
  await expect(
    page.getByRole('heading', { name: 'Prepare a conta da casa' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Ver disponibilidade da extensão' }),
  ).toHaveAttribute('href', '/extensao?casa=7&apagadas=1');
  await page
    .getByRole('link', { name: 'Ver disponibilidade da extensão' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'O download ainda não está disponível' }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Prepare a conta da casa' }),
  ).toBeVisible();
  expect(mutations).toEqual([]);
  expect(await page.locator('select,input[type=date]').count()).toBe(0);
});
test('cartão pendente, erro recuperável e retomada usam respostas e não storage de conclusão', async ({
  page,
}) => {
  await page.route('**/api/v1/billing/status', (route) =>
    route.fulfill({
      json: {
        ...billingStatus,
        access: 'READ_ONLY',
        status: 'AWAITING_CARD',
        trial_confirmed: false,
      },
    }),
  );
  await page.goto(demo + '/inicio?casa=7&apagadas=1');
  await expect(
    page.getByRole('heading', {
      name: 'Confira seu acesso para enviar apostas',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Abrir Nova aposta' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Como usar: Prints dos bilhetes' }),
  ).toBeVisible();
  await page.unroute('**/api/v1/billing/status');
  let fail = true;
  await page.route('**/api/v1/apostas?*', (route) =>
    route.fulfill({
      status: fail ? 500 : 200,
      json: fail
        ? { detail: 'private-input' }
        : inicioResposta('/api/v1/apostas', true),
    }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Prepare a conta da casa' }),
  ).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: /Tentar/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Suas apostas já estão no site' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage)
        .concat(Object.keys(sessionStorage))
        .filter((key) => /onboarding|conclu|inicio/i.test(key)),
    ),
  ).toEqual([]);
});
