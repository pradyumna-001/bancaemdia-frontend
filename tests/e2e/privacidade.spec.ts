import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const url = 'http://127.0.0.1:4214/configuracoes/privacidade?casa=7&apagadas=1';
test('Privacidade: exportação, confirmação, temas, foco e reflow', async ({
  page,
}, info) => {
  let deletes = 0;
  await page.route('**/api/v1/usuario/me', async (route) => {
    deletes++;
    await route.fulfill({
      status: 409,
      json: { detail: 'diagnóstico interno não exibido' },
    });
  });
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Privacidade', exact: true }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`privacidade-${theme}.png`),
      fullPage: true,
    });
  }
  for (const [label, file] of [
    ['JSON', 'json'],
    ['Excel', 'xlsx'],
  ]) {
    const downloaded = page.waitForEvent('download');
    await page
      .getByRole('button', { name: `Baixar ${label}`, exact: true })
      .click();
    expect((await downloaded).suggestedFilename()).toBe(`meus-dados.${file}`);
  }
  await page
    .getByRole('button', { name: 'Solicitar encerramento', exact: true })
    .click();
  const modal = page.getByRole('dialog');
  await expect(
    modal.getByRole('button', { name: 'Manter minha conta', exact: true }),
  ).toBeFocused();
  await expect(
    modal.getByRole('button', { name: 'Confirmar encerramento', exact: true }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Solicitar encerramento', exact: true }),
  ).toBeFocused();
  expect(deletes).toBe(0);
  await page
    .getByRole('button', { name: 'Solicitar encerramento', exact: true })
    .click();
  await modal.getByRole('checkbox').check();
  await modal
    .getByRole('button', { name: 'Confirmar encerramento', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'O encerramento precisa de acompanhamento',
    }),
  ).toBeVisible();
  expect(deletes).toBe(1);
  await expect(page.getByText('diagnóstico interno não exibido')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('link', { name: 'Voltar às configurações' }),
  ).toHaveAttribute('href', '/configuracoes?casa=7&apagadas=1');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('Privacidade: resposta perdida não reenvia encerramento', async ({
  page,
}) => {
  let deletes = 0;
  await page.route('**/api/v1/usuario/me', async (route) => {
    deletes++;
    await route.abort('failed');
  });
  await page.goto(url);
  await page
    .getByRole('button', { name: 'Solicitar encerramento', exact: true })
    .click();
  await page.getByRole('checkbox').check();
  await page
    .getByRole('button', { name: 'Confirmar encerramento', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'O resultado ainda não foi confirmado' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Consultar sessão', exact: true })
    .click();
  await expect(page.getByText(/^A conta continua acessível/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Solicitar encerramento', exact: true }),
  ).toBeDisabled();
  expect(deletes).toBe(1);
});
test('aplicativo público não aceita sessão da fixture de Privacidade', async ({
  page,
}) => {
  await page.route('**/config.json', (r) =>
    r.fulfill({
      json: {
        VITE_API_URL: 'http://127.0.0.1:4214',
        VITE_APP_ENV: 'production',
      },
    }),
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
  await page.goto('http://127.0.0.1:4173/configuracoes/privacidade');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Solicitar encerramento', exact: true }),
  ).toHaveCount(0);
});
