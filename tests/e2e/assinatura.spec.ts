import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { billingStatus } from '../fixtures/acesso';
import type { components } from '../../src/api/schema';

type Status = components['schemas']['BillingStatusResponse'];
const base: Status = {
  ...billingStatus,
  status: 'AWAITING_CARD',
  access: 'READ_ONLY',
  trial_confirmed: false,
  trial_started_at: null,
  trial_ends_at: null,
  checkout_available: true,
  prices: [
    { id: 1, amount_minor: 12345, currency: 'BRL', frequency: 'MONTHLY' },
    { id: 2, amount_minor: 99000, currency: 'BRL', frequency: 'YEARLY' },
  ],
};
async function api(page: Page, initial: Status = base) {
  let status = initial;
  let reads = 0;
  const writes: Array<{
    path: string;
    key: string | undefined;
    body: string | null;
  }> = [];
  let post = async (route: Route) =>
    route.fulfill({
      json: { url: 'https://checkout.stripe.com/c/pay/disposable' },
      headers,
    });
  const headers = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, Idempotency-Key, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  const csrf = crypto.randomUUID();
  await page.route('http://127.0.0.1:8000/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers });
    const path = new URL(request.url()).pathname;
    if (path === '/auth/session')
      return route.fulfill({
        json: {
          usuario_id: 1,
          nome: 'Sandbox',
          email: 'sandbox@example.org',
          session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
          csrf_token: csrf,
          refresh_required: false,
          access_expires_at: '2030-01-01T00:00:00Z',
          session_expires_at: '2030-01-02T00:00:00Z',
        },
        headers,
      });
    if (path === '/api/v1/billing/status') {
      reads++;
      return route.fulfill({ json: status, headers });
    }
    if (path.startsWith('/api/v1/billing/') && request.method() === 'POST') {
      writes.push({
        path,
        key: request.headers()['idempotency-key'],
        body: request.postData(),
      });
      return post(route);
    }
    return route.fulfill({
      json: {
        total: 0,
        por_motivo: {},
        mais_antiga_em: null,
        idade_maxima_segundos: 0,
      },
      headers,
    });
  });
  return {
    headers,
    writes,
    reads: () => reads,
    reply: (value: Status) => {
      status = value;
    },
    post: (handler: typeof post) => {
      post = handler;
    },
  };
}

test('Assinatura legível nos dois temas; preços do servidor e filtros preservados', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', () => errors.push('pageerror'));
  await api(page);
  await page.goto('/assinatura?casa=7&apagadas=1');
  await expect(
    page.getByText('Confirmação do cartão pendente', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continuar para assinatura' }),
  ).toBeDisabled();
  await page.getByRole('radio', { name: 'R$ 123,45 por mês' }).check();
  await expect(
    page.getByRole('button', { name: 'Continuar para assinatura' }),
  ).toBeEnabled();
  for (const theme of ['claro', 'escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page
      .getByRole('radio', {
        name: theme === 'claro' ? 'Claro' : 'Escuro',
        exact: true,
      })
      .check();
    await page.getByRole('button', { name: 'Fechar opções' }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await info.attach(`assinatura-${theme}`, {
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
  await page.getByRole('button', { name: 'Continuar para assinatura' }).focus();
  await expect(
    page.getByRole('button', { name: 'Continuar para assinatura' }),
  ).toBeFocused();
  await expect(
    page.locator('input[type="password"], input[name="card"], select'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Voltar para Apostas' }),
  ).toHaveAttribute('href', '/?casa=7&apagadas=1');
  expect(errors).toEqual([]);
});

test('Checkout explícito retorna sem conceder acesso; confirmação assíncrona vem da API', async ({
  page,
}) => {
  const s = await api(page);
  await page.route('https://checkout.stripe.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><meta charset="utf-8"><h1>Checkout descartável</h1>',
    }),
  );
  await page.goto('/assinatura?casa=7&apagadas=1#secao');
  await page.getByRole('radio', { name: 'R$ 123,45 por mês' }).check();
  await page.getByRole('button', { name: 'Continuar para assinatura' }).click();
  await expect(
    page.getByRole('heading', { name: 'Checkout descartável' }),
  ).toBeVisible();
  expect(s.writes).toHaveLength(1);
  expect(s.writes[0]!.key).toMatch(/^[\w-]{8,128}$/);
  expect(JSON.parse(s.writes[0]!.body!)).toEqual({
    currency: 'BRL',
    frequency: 'MONTHLY',
  });
  await page.goto('/assinatura?success=1&session_id=discarded');
  await expect(page).toHaveURL(/\/assinatura\?casa=7&apagadas=1#secao$/);
  await expect(
    page.getByText('Confirmação do cartão pendente', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Sua conta está em modo de leitura' }),
  ).toBeVisible();
  const before = s.reads();
  await expect(
    page.getByText('Conferindo a situação após o retorno…'),
  ).toBeHidden({ timeout: 12_000 });
  expect(s.reads() - before).toBeLessThanOrEqual(3);
  s.reply({
    ...base,
    status: 'TRIALING',
    access: 'FULL_WRITE',
    trial_confirmed: true,
    trial_started_at: '2026-10-08T12:00:00Z',
    trial_ends_at: '2026-10-15T12:00:00Z',
    can_manage: true,
  });
  await page.getByRole('button', { name: 'Atualizar situação' }).click();
  await expect(
    page.getByText('Período gratuito confirmado', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Acesso à conta' }),
  ).toHaveCount(0);
  expect(s.writes).toHaveLength(1);
});

test('Portal e cancelamento em leitura; desistir não envia e agendamento é confirmado no servidor', async ({
  page,
}) => {
  const current: Status = {
    ...base,
    status: 'ACTIVE',
    can_manage: true,
    current_period_ends_at: '2026-11-08T12:00:00Z',
  };
  const s = await api(page, current);
  await page.route('https://billing.stripe.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><meta charset="utf-8"><h1>Portal descartável</h1>',
    }),
  );
  s.post(async (route) =>
    route.fulfill({
      json: { url: 'https://billing.stripe.com/p/session/disposable' },
      headers: s.headers,
    }),
  );
  await page.goto('/assinatura?casa=7');
  await page
    .getByRole('button', { name: 'Abrir gestão da assinatura' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Portal descartável' }),
  ).toBeVisible();
  await page.goto('/assinatura');
  await expect(
    page.getByText('Conferindo a situação após o retorno…'),
  ).toBeHidden({ timeout: 12_000 });
  await page.getByRole('button', { name: 'Solicitar cancelamento' }).click();
  await page.getByRole('button', { name: 'Manter assinatura' }).click();
  expect(s.writes).toHaveLength(1);
  s.post(async (route) => {
    s.reply({ ...current, cancel_at_period_end: true });
    return route.fulfill({
      json: { status: 'cancellation_scheduled' },
      headers: s.headers,
    });
  });
  await page.getByRole('button', { name: 'Solicitar cancelamento' }).click();
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(
    page.getByText('Cancelamento agendado pelo serviço.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Solicitar cancelamento' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Assinatura', exact: true }),
  ).toBeFocused();
  expect(s.writes).toHaveLength(2);
});

for (const kind of ['conflito', 'destino inválido'])
  test(`pedido com ${kind} preserva preço e não reenvia`, async ({ page }) => {
    const s = await api(page);
    s.post(async (route) =>
      route.fulfill({
        status: kind === 'conflito' ? 409 : 200,
        json:
          kind === 'conflito'
            ? { detail: 'billing_reconciliation_required private secret' }
            : { url: 'https://evil.example/private' },
        headers: s.headers,
      }),
    );
    await page.goto('/assinatura');
    await page.getByRole('radio', { name: 'R$ 123,45 por mês' }).check();
    await page
      .getByRole('button', { name: 'Continuar para assinatura' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Continuar para assinatura' }),
    ).toBeDisabled();
    await expect(
      page.getByRole('radio', { name: 'R$ 123,45 por mês' }),
    ).toBeChecked();
    await page.getByRole('button', { name: 'Conferir resultado' }).click();
    expect(s.writes).toHaveLength(1);
    await expect(page).toHaveURL(/\/assinatura$/);
    await expect(page.getByText(/private secret/)).toHaveCount(0);
  });

test('catálogo vazio tem saída útil e build público exige sessão nas rotas da demonstração', async ({
  page,
}) => {
  await api(page, {
    ...base,
    prices: [],
    checkout_available: false,
    status: 'EXPIRED',
  });
  await page.goto('/assinatura');
  await expect(
    page.getByRole('heading', {
      name: 'Assinatura indisponível para novos pedidos',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continuar para assinatura' }),
  ).toHaveCount(0);
  await page.goto('/testes/assinatura?session=true');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
});
