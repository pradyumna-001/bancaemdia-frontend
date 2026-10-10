import { expect, test, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { billingStatus } from '../fixtures/acesso';
const fixture = 'http://127.0.0.1:4178';
const cors = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'X-CSRF-Token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const respond = (route: Route, json: unknown, status = 200) =>
  route.fulfill({ json, status, headers: cors });

test('aviso público permite continuar, preserva filtros, temas e reflow sem liberar escrita por URL/storage', async ({
  page,
  context,
}, info) => {
  const csrf = crypto.randomUUID();
  await context.route('http://127.0.0.1:8000/**', async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: cors });
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/session')
      return respond(route, {
        usuario_id: 1,
        nome: 'Sandbox',
        email: 'sandbox@example.org',
        session_version: `aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1`,
        csrf_token: csrf,
        refresh_required: false,
        access_expires_at: '2030-01-01T00:00:00Z',
        session_expires_at: '2030-01-02T00:00:00Z',
      });
    if (path === '/api/v1/billing/status')
      return respond(route, { ...billingStatus, access: 'READ_ONLY' });
    return respond(route, {
      total: 0,
      por_motivo: {},
      mais_antiga_em: null,
      idade_maxima_segundos: 0,
    });
  });
  await page.goto('/painel?casa=7&apagadas=1&access=FULL_WRITE');
  const region = page.getByRole('region', { name: 'Acesso à conta' });
  await expect(
    region.getByRole('heading', { name: 'Sua conta está em modo de leitura' }),
  ).toBeVisible();
  await expect(
    region.getByRole('link', { name: 'Ver assinatura' }),
  ).toHaveAttribute('href', '/assinatura?casa=7&apagadas=1&access=FULL_WRITE');
  await page.evaluate(() => {
    localStorage.setItem('access', 'FULL_WRITE');
    sessionStorage.setItem('access', 'FULL_WRITE');
  });
  await page.reload();
  await expect(region).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem('access');
    sessionStorage.removeItem('access');
  });
  for (const tema of ['claro', 'escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page
      .getByRole('radio', {
        name: tema === 'claro' ? 'Claro' : 'Escuro',
        exact: true,
      })
      .check();
    await page.getByRole('button', { name: 'Fechar opções' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-tema', tema);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await info.attach(`acesso-${tema}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await region.getByRole('button', { name: 'Conferir acesso' }).focus();
  await expect(
    region.getByRole('button', { name: 'Conferir acesso' }),
  ).toBeFocused();
  await region.getByRole('link', { name: 'Ver assinatura' }).click();
  await expect(page).toHaveURL(
    /\/assinatura\?casa=7&apagadas=1&access=FULL_WRITE$/,
  );
});
test('402 durante escrita preserva entrada e não repete após confirmação do acesso', async ({
  page,
}) => {
  let mode: 'FULL_WRITE' | 'READ_ONLY' = 'FULL_WRITE';
  let writes = 0;
  await page.route(fixture + '/api/v1/billing/status', (route) =>
    route.fulfill({ json: { ...billingStatus, access: mode } }),
  );
  await page.route(fixture + '/api/v1/apostas', async (route) => {
    writes++;
    mode = 'READ_ONLY';
    await route.fulfill({ status: 402, json: { detail: 'account_read_only' } });
  });
  await page.goto(fixture + '/testes/acesso?casa=7');
  const save = page.getByRole('button', { name: 'Salvar aposta de teste' });
  await expect(save).toBeEnabled();
  await page.getByLabel('Descrição de teste').fill('Entrada preservada');
  await save.click();
  await expect(
    page.getByRole('region', { name: 'Acesso à conta' }).getByRole('heading'),
  ).toHaveText('Sua conta está em modo de leitura');
  await expect(save).toBeDisabled();
  await expect(page.getByLabel('Descrição de teste')).toHaveValue(
    'Entrada preservada',
  );
  expect(writes).toBe(1);
  mode = 'FULL_WRITE';
  await page
    .getByRole('button', { name: 'Conferir acesso', exact: true })
    .click();
  await expect(save).toBeEnabled();
  expect(writes).toBe(1);
  await expect(
    page.getByRole('heading', {
      name: 'Este pedido foi bloqueado para escrita',
    }),
  ).toBeVisible(); // The previous refusal is distinct from the current, recovered access.
});
test('erro e prazo longo encerram tentativas e mantêm formulário acessível', async ({
  page,
}) => {
  let calls = 0;
  await page.route(fixture + '/api/v1/billing/status', (route) => {
    calls++;
    return route.fulfill({
      status: 503,
      headers: { 'Retry-After': '120' },
      json: { detail: 'private text' },
    });
  });
  await page.goto(fixture + '/testes/acesso');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível conferir seu acesso' }),
  ).toBeVisible();
  await page.getByLabel('Descrição de teste').fill('Não apagar');
  await expect(
    page.getByRole('button', { name: 'Conferir acesso' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Salvar aposta de teste' }),
  ).toBeDisabled();
  await page.bringToFront();
  await expect(page.getByLabel('Descrição de teste')).toHaveValue('Não apagar');
  expect(calls).toBe(1);
  await expect(page.getByText('private text')).toHaveCount(0);
});
