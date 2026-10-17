import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const base = 'http://127.0.0.1:4219';
test('dispositivos, sessões e fronteira nos temas, teclado, foco e reflow 320px', async ({
  page,
}, info) => {
  await page.goto(base + '/coleta?casa=7&apagadas=1');
  await expect(
    page.getByRole('article', { name: 'Notebook pessoal' }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Computador de casa' }),
  ).toContainText('Última encerrada');
  await expect(
    page.getByRole('article', { name: 'Notebook anterior' }),
  ).toContainText('Sem sessão registrada');
  await expect(page.getByRole('link', { name: 'Ver Apostas' })).toHaveAttribute(
    'href',
    '/?casa=7&apagadas=1',
  );
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await info.attach(`coleta-${theme}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
  const rotate = page
    .getByRole('article', { name: 'Notebook pessoal' })
    .getByRole('button', { name: 'Trocar credencial' });
  await rotate.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: /Trocar credencial:/ }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(rotate).toBeFocused();
  const generate = page.getByRole('button', {
    name: 'Gerar código de conexão',
  });
  await generate.click();
  await expect(
    page.getByRole('heading', { name: 'Seu código de conexão' }),
  ).toBeFocused();
  await expect(page.locator('.coleta-codigo')).toContainText('cpc_');
  await expect(page).toHaveURL(/casa=7&apagadas=1$/);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain('cpc_');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await info.attach('coleta-320', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Ocultar e concluir' }).click();
  await expect(page.locator('.coleta-codigo')).toHaveCount(0);
  await page.getByRole('link', { name: 'Como conectar a extensão' }).click();
  await expect(
    page.getByRole('heading', { name: 'Conectar a extensão', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Gerenciar dispositivos em Coleta' })
    .click();
  await expect(page.locator('.coleta-codigo')).toHaveCount(0);
  await expect(page).toHaveURL(/coleta\?casa=7&apagadas=1&guia=coleta$/);
});
test('build público não aceita a sessão nem os controles da fixture', async ({
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
  await page.goto('/coleta?fixture=' + encodeURIComponent(base));
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Gerar código de conexão' }),
  ).toHaveCount(0);
});
