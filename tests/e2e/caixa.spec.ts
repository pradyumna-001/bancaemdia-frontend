import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { caixaFixture } from '../fixtures/caixa';
import { bancasFixture } from '../fixtures/bancas';
const url = 'http://127.0.0.1:4210/banca';
test('Caixa: saldo desconhecido, transferência atômica, temas, teclado e reflow', async ({
  page,
}, info) => {
  const fixture = caixaFixture();
  await page.route('**/api/v1/caixa**', async (route) => {
    const request = route.request();
    const result = fixture.handle(
      request.method(),
      new URL(request.url()),
      request.method() === 'GET' ? undefined : request.postDataJSON(),
      request.headers()['idempotency-key'],
    );
    await route.fulfill({ status: result.status, json: result.data });
  });
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Marina · Betano · Principal' }),
  ).toBeVisible();
  await expect(
    page.getByText('Saldo desconhecido', { exact: true }),
  ).toHaveCount(2);
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`caixa-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: /^Movimento / }).click();
  await page
    .getByRole('button', { name: 'Transferência', exact: true })
    .click();
  await page.getByRole('button', { name: /^Conta de origem / }).click();
  await page
    .getByRole('button', { name: 'Marina · Betano · Principal', exact: true })
    .click();
  await page.getByRole('button', { name: /^Conta de destino / }).click();
  await page
    .getByRole('button', {
      name: 'Sem titular · Betano · Reserva',
      exact: true,
    })
    .click();
  await page.getByLabel('Valor (R$)', { exact: true }).fill('15,00');
  await page.getByLabel('Data e hora com fuso').fill('13/10/2026 14:30-03:00');
  const submit = page.getByRole('button', {
    name: 'Conferir lançamento',
    exact: true,
  });
  await submit.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Confirmar lançamento?' });
  await expect(
    dialog.getByRole('button', { name: 'Cancelar', exact: true }),
  ).toBeFocused();
  expect(fixture.receipts.size).toBe(0);
  await page.keyboard.press('Escape');
  await expect(submit).toBeFocused();
  await submit.click();
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByText('Transferência registrada.', { exact: true }),
  ).toBeVisible();
  await expect(submit).toBeFocused();
  expect(fixture.receipts.size).toBe(1);
  expect([...fixture.receipts.values()][0]!.data.movimentos).toHaveLength(2);
  const bankPicker = page.getByRole('button', { name: /^Banca da conta 11 / });
  await bankPicker.click();
  await page
    .getByRole('button', { name: 'Banca de reserva', exact: true })
    .click();
  const account = page.getByRole('article').filter({
    has: page.getByRole('heading', {
      name: 'Marina · Betano · Principal',
      exact: true,
    }),
  });
  await account
    .getByRole('button', { name: 'Salvar vínculo', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirmar vínculo da conta?' })
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(bankPicker).toBeFocused();
  expect(fixture.saldo.contas[0]!.banca_id).toBe(1);
  await page.getByRole('link', { name: 'Extrato', exact: true }).click();
  await expect(page.getByText('Aposta · GREEN')).toBeVisible();
  await page.goto(
    url + '?movimento=' + (await page.evaluate(() => crypto.randomUUID())),
  );
  await expect(
    page.getByRole('heading', { name: 'Marina · Betano · Principal' }),
  ).toBeVisible();
  await expect(bankPicker).toBeDisabled();
  await expect(submit).toBeDisabled();
  await expect(
    page.getByRole('button', {
      name: 'Conferir movimentos e vínculo',
      exact: true,
    }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('Bancas: criar com capital, editar, arquivar com confirmação e teclado', async ({
  page,
}) => {
  const bancas = bancasFixture();
  const writes: Array<{ method: string; key: string; url: string }> = [];
  await page.route('**/api/v1/bancas**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const key = request.headers()['idempotency-key'] ?? '';
    if (request.method() === 'GET' && path === '/api/v1/bancas')
      return route.fulfill({ json: bancas.lista() });
    if (path === '/api/v1/bancas/intencao') {
      const r = bancas.intencao(key);
      return route.fulfill({ status: r.status, json: r.data });
    }
    writes.push({ method: request.method(), key, url: page.url() });
    const id = Number(path.split('/')[4]);
    const r =
      request.method() === 'PATCH'
        ? bancas.alterar(key, id, request.postDataJSON())
        : path.endsWith('/arquivar')
          ? bancas.arquivar(key, id)
          : bancas.criar(key, request.postDataJSON());
    return route.fulfill({ status: r.status, json: r.data });
  });
  await page.goto(url);
  const secao = page.getByRole('region', { name: 'Bancas' });
  await expect(
    secao.getByRole('heading', { name: 'Banca principal' }),
  ).toBeVisible();
  await secao.getByRole('button', { name: 'Nova banca' }).click();
  await secao.getByLabel('Nome da banca').fill('Banca de teste');
  await secao.getByLabel('Capital inicial (R$)').fill('2500,00');
  await secao.getByLabel('Capital inicial (R$)').press('Enter');
  await expect(secao).toContainText('Banca Banca de teste criada.');
  expect(writes).toHaveLength(1);
  expect(writes[0]!.key).toMatch(/^[0-9a-f-]{36}$/);
  await expect(
    secao.getByRole('article', { name: 'Banca de teste' }),
  ).toContainText('R$ 2.500,00');
  await secao.getByRole('button', { name: 'Editar Banca de teste' }).click();
  await secao.getByLabel('Capital inicial (R$)').fill('');
  await secao.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    secao.getByRole('article', { name: 'Banca de teste' }),
  ).toContainText('Não informado');
  const arquivar = secao.getByRole('button', {
    name: 'Arquivar Banca de teste',
  });
  await arquivar.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Arquivar esta banca?' });
  await expect(dialog.getByRole('button', { name: 'Agora não' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(arquivar).toBeFocused();
  expect(writes).toHaveLength(2);
  await arquivar.click();
  await dialog.getByRole('button', { name: 'Arquivar banca' }).click();
  await expect(secao).toContainText('Bancas arquivadas (1)');
  expect(writes).toHaveLength(3);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('build público rejeita sessão simulada do Caixa', async ({ page }) => {
  await page.route('**/config.json', (route) =>
    route.fulfill({
      json: {
        VITE_API_URL: 'http://127.0.0.1:4210',
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
  await page.goto(
    'http://127.0.0.1:4173/banca?fixture=http://127.0.0.1:4210&session=true',
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Marina · Betano · Principal' }),
  ).toHaveCount(0);
});
