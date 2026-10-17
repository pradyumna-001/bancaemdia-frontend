import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const demo = process.env.TROCA_DEMO_URL ?? 'http://127.0.0.1:4225';
async function choose(page: Page, label: string, name: string) {
  const button = page.getByRole('button', {
    name: new RegExp('^' + label + ' '),
  });
  await expect(button).toBeEnabled();
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: label });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
}
async function prepare(page: Page) {
  await page.goto(demo + '/contas/trocar?casa=7&tipster=5&apagadas=1');
  await expect(
    page.getByRole('heading', { name: '2. Prepare a troca' }),
  ).toBeVisible();
  await choose(page, 'Conta anterior', 'Conta principal · Marina');
  await choose(page, 'Nova conta', 'Conta reserva · Rafael');
  await page.getByRole('button', { name: /^Data da troca / }).click();
  const calendar = page.getByRole('dialog', { name: 'Data da troca' });
  await calendar.locator('button[data-dia]').nth(10).click();
  await expect(calendar).not.toBeVisible();
  await page.getByLabel('Hora da troca', { exact: true }).fill('14:30');
  await choose(page, 'Estado final da conta anterior', 'Limitada');
  await expect(
    page.getByRole('button', { name: 'Consultar prévia da troca' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Consultar prévia da troca' }).click();
  await expect(
    page.getByRole('heading', { name: '3. Confira a prévia' }),
  ).toBeVisible();
}
test('prévia explícita, confirmação por teclado e apresentação em ambos os temas', async ({
  page,
}, info) => {
  const writes: { key: string | undefined; body: unknown }[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/titulares/trocas'))
      writes.push({
        key: r.headers()['idempotency-key'],
        body: r.postDataJSON(),
      });
  });
  await prepare(page);
  expect(writes).toHaveLength(1);
  await expect(
    page
      .getByText('3 apostas para conferir a atribuição', { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Consultar Apostas com os filtros preservados',
    }),
  ).toHaveAttribute('href', '/?casa=7&tipster=5&apagadas=1');
  const trigger = page.getByRole('button', {
    name: 'Continuar para confirmação',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Confirmar esta troca?' });
  await expect(dialog.getByRole('button', { name: 'Agora não' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await document.fonts.ready;
    });
    await page.evaluate((theme) => {
      document.documentElement.dataset.tema = theme;
    }, theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath('troca-previa-' + theme + '.png'),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await trigger.click();
  await dialog
    .getByRole('button', { name: 'Confirmar troca', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Troca confirmada' }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
  expect(page.url()).not.toContain(writes[0]!.key!);
  expect(await page.locator('select,input[type=date]').count()).toBe(0);
});
test('resposta perdida e recarga consultam a mesma identidade sem reenviar o corpo', async ({
  page,
}) => {
  await prepare(page);
  await page.getByText('Código de consulta', { exact: true }).click();
  const key = await page
    .locator('#troca-consulta')
    .locator('..')
    .locator('details .numero')
    .innerText();
  let count = 0;
  let committed!: () => void;
  const lostResponse = new Promise<void>((resolve) => {
    committed = resolve;
  });
  await page.route('**/api/v1/titulares/trocas', async (route) => {
    count++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort('failed');
    committed();
  });
  await page
    .getByRole('button', { name: 'Continuar para confirmação' })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirmar esta troca?' })
    .getByRole('button', { name: 'Confirmar troca' })
    .click();
  await lostResponse;
  await expect(
    page.getByText(/O resultado deste pedido ainda não foi confirmado/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Consultar resultado da mesma intenção' }),
  ).toBeEnabled();
  expect(count).toBe(1);
  await page.reload();
  await page.getByText('Consultar uma troca anterior', { exact: true }).click();
  await page.getByLabel('Código de consulta anterior').fill(key);
  await page.getByRole('button', { name: 'Usar código para consulta' }).click();
  await expect(
    page.getByText(/Os dados do pedido saíram da memória/),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Consultar resultado da mesma intenção' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Troca confirmada' }),
  ).toBeVisible();
  expect(count).toBe(1);
});
test('prévia desatualizada requer nova identidade e nova confirmação', async ({
  page,
}) => {
  await prepare(page);
  const oldKey = await page
    .locator('#troca-consulta')
    .locator('..')
    .locator('details .numero')
    .textContent();
  await page.route('**/api/v1/titulares/trocas', (route) =>
    route.fulfill({ status: 409, json: { detail: 'swap_preview_stale' } }),
  );
  await page
    .getByRole('button', { name: 'Continuar para confirmação' })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirmar esta troca?' })
    .getByRole('button', { name: 'Confirmar troca' })
    .click();
  await expect(
    page.getByText(/A prévia não pode ser confirmada/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Preparar outra troca' }).click();
  await page.getByRole('button', { name: 'Consultar prévia da troca' }).click();
  await expect(
    page.getByRole('heading', { name: '3. Confira a prévia' }),
  ).toBeVisible();
  expect(
    await page
      .locator('#troca-consulta')
      .locator('..')
      .locator('details .numero')
      .textContent(),
  ).not.toBe(oldKey);
  await expect(
    page.getByRole('button', { name: 'Continuar para confirmação' }),
  ).toBeVisible();
});
test('leitura preserva consulta e erros limitados respeitam o prazo', async ({
  page,
}) => {
  await page.route('**/api/v1/billing/status', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), access: 'READ_ONLY' },
    });
  });
  await page.goto(demo + '/contas/trocar?casa=7&apagadas=1');
  await expect(
    page.getByText(/Você pode consultar uma troca anterior/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Conta anterior / }),
  ).toBeDisabled();
  await page.getByText('Consultar uma troca anterior', { exact: true }).click();
  await page
    .getByLabel('Código de consulta anterior')
    .fill(crypto.randomUUID());
  await page.getByRole('button', { name: 'Usar código para consulta' }).click();
  await page.route('**/api/v1/titulares/trocas/intencao', (route) =>
    route.fulfill({
      status: 429,
      headers: { 'Retry-After': '61' },
      json: { detail: 'rate_limit' },
    }),
  );
  await page
    .getByRole('button', { name: 'Consultar resultado da mesma intenção' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Consultar resultado da mesma intenção' }),
  ).toBeDisabled();
  await expect(
    page.getByText(/O serviço pediu uma pausa antes de novas ações/),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
