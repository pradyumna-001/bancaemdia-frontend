import { expect, test } from '@playwright/test';
import { caixaFixture } from '../fixtures/caixa';
test('Caixa recupera resposta perdida com o mesmo pedido na aplicação completa', async ({
  page,
}) => {
  const fixture = caixaFixture();
  let lost = true;
  const writes: { key: string; body: unknown }[] = [];
  await page.route('**/api/v1/caixa**', async (route) => {
    const request = route.request();
    const key = request.headers()['idempotency-key'];
    const body =
      request.method() === 'GET' ? undefined : request.postDataJSON();
    if (request.method() === 'POST') writes.push({ key: key!, body });
    const response = fixture.handle(
      request.method(),
      new URL(request.url()),
      body,
      key,
    );
    if (request.method() === 'POST' && lost) {
      lost = false;
      await route.abort('failed');
    } else
      await route.fulfill({ status: response.status, json: response.data });
  });
  await page.goto('http://127.0.0.1:4210/banca');
  await expect(
    page.getByRole('heading', { name: 'Marina · Betano · Principal' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Conta do lançamento / }).click();
  await page
    .getByRole('button', { name: 'Marina · Betano · Principal', exact: true })
    .click();
  await page.getByLabel('Valor (R$)', { exact: true }).fill('10,00');
  await page.getByLabel('Data e hora com fuso').fill('13/10/2026 14:30-03:00');
  await page
    .getByRole('button', { name: 'Conferir lançamento', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirmar lançamento?' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Conferir o lançamento', exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await page
    .getByRole('button', { name: 'Conferir movimentos e vínculo', exact: true })
    .click();
  const replay = page.getByRole('button', {
    name: 'Reenviar este lançamento',
    exact: true,
  });
  await expect(replay).toBeEnabled();
  await replay.click();
  await expect(
    page.getByText('Depósito registrado.', { exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
  expect(fixture.receipts.size).toBe(1);
});
