import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { revisaoFixture } from '../fixtures/revisao';
const url = 'http://127.0.0.1:4212/revisao';
test('Revisão: conta, conflito de tipster, confirmação, temas e reflow', async ({
  page,
}, info) => {
  const fixture = revisaoFixture();
  await page.route('**/api/v1/revisao-operacional/**', async (route) => {
    const r = route.request();
    const result = fixture.handle(
      r.method(),
      new URL(r.url()),
      r.method() === 'GET' ? undefined : r.postDataJSON(),
    );
    if (r.method() === 'POST')
      expect(page.url()).toContain(
        'revisao_operacao=' + r.url().split('/').at(-1),
      );
    await route.fulfill({ status: result.status, json: result.data });
  });
  await page.goto(url + '?motivo=consolidacao&casa=7&apagadas=1');
  await expect(
    page.getByRole('heading', { name: 'Grêmio × Internacional', exact: true }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath('revisao-' + theme + '.png'),
      fullPage: true,
    });
  }
  const same = page.getByRole('button', {
    name: 'São a mesma aposta',
    exact: true,
  });
  await same.click();
  await expect(
    page.getByText('Escolha o tipster que deve ficar na aposta.', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /^Tipster da aposta vinculada / })
    .click();
  await page
    .getByRole('button', { name: 'Telegram · Rafael', exact: true })
    .click();
  await same.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'São a mesma aposta?' });
  await expect(
    dialog.getByRole('button', { name: 'Voltar à revisão', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(same).toBeFocused();
  expect(fixture.receipts.size).toBe(0);
  await same.click();
  await dialog
    .getByRole('button', { name: 'Confirmar decisão', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Tudo conferido neste recorte',
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.receipts.size).toBe(1);
  expect(page.url()).toContain('casa=7');
  expect(page.url()).toContain('apagadas=1');
  await page
    .getByRole('button', { name: 'Consultar toda a fila', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Botafogo', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Escolher conta Palmeiras/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Palmeiras × Santos', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Confirmar conta', exact: true })
    .click();
  await expect(
    page.getByText('Escolha uma conta válida para esta aposta.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Conta para esta aposta / }).click();
  await page
    .getByRole('button', {
      name: 'Principal · Marina · EM_USO · corresponde ao dia do jogo',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Confirmar conta', exact: true })
    .click();
  await expect(
    page.getByText(
      'Revisão resolvida. A fila foi consultada novamente desde o início.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page).not.toHaveURL(/revisao_operacao=/);
  await expect(page).not.toHaveURL(/revisao_item=/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('Revisão: intenção recarregada só consulta; erro e referência inválida têm saída', async ({
  page,
}) => {
  await page.goto(
    url + '?revisao_operacao=a1234567-1234-1234-1234-123456789abc',
  );
  await page
    .getByRole('button', { name: 'Consultar decisão', exact: true })
    .click();
  await expect(
    page.getByText('Não encontramos o que você procurou.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reenviar a mesma decisão', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Voltar à fila sem reconstruir a decisão',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Botafogo', exact: true }),
  ).toBeVisible();
  await page.goto(url + '?revisao_operacao=x');
  await page
    .getByRole('button', { name: 'Remover referência inválida', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Botafogo', exact: true }),
  ).toBeVisible();
});
test('build público recusa sessão da fixture de Revisão', async ({ page }) => {
  await page.route('**/config.json', (r) =>
    r.fulfill({
      json: {
        VITE_API_URL: 'http://127.0.0.1:4212',
        VITE_APP_ENV: 'production',
      },
    }),
  );
  await page.route('http://127.0.0.1:8000/**', (route) =>
    route.fulfill({
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { code: 'not_authenticated' },
    }),
  );
  await page.goto('http://127.0.0.1:4173/revisao');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Botafogo', exact: true }),
  ).toHaveCount(0);
});
