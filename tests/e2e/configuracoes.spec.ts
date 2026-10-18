import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { billingStatus } from '../fixtures/acesso';

const headers = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Retry-After',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, Content-Type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
};
const url = '/configuracoes?casa=7&apagadas=1';
async function api(page: Page, access = 'FULL_WRITE') {
  let saved = 'America/Sao_Paulo';
  let read = (route: Route) =>
    route.fulfill({ json: { fuso_horario: saved }, headers });
  let write = (route: Route) => {
    saved = (route.request().postDataJSON() as { fuso_horario: string })
      .fuso_horario;
    return route.fulfill({ json: { fuso_horario: saved }, headers });
  };
  const writes: Array<{ csrf: boolean; body: unknown }> = [];
  const reads: string[] = [];
  await page.route('http://127.0.0.1:8000/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers });
    if (path === '/auth/session')
      return route.fulfill({
        json: {
          usuario_id: 1,
          nome: 'Sandbox',
          email: 'sandbox@example.org',
          session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
          csrf_token: crypto.randomUUID(),
          refresh_required: false,
          access_expires_at: '2030-01-01T00:00:00Z',
          session_expires_at: '2030-01-02T00:00:00Z',
        },
        headers,
      });
    if (path === '/api/v1/billing/status')
      return route.fulfill({ json: { ...billingStatus, access }, headers });
    if (path === '/api/v1/painel/preferencias') {
      if (req.method() === 'GET') {
        reads.push(path);
        return read(route);
      }
      writes.push({
        csrf: !!req.headers()['x-csrf-token'],
        body: req.postDataJSON(),
      });
      return write(route);
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
    reads,
    writes,
    read: (next: typeof read) => {
      read = next;
    },
    respond: (next: typeof write) => {
      write = next;
    },
  };
}
async function choose(page: Page) {
  await page.getByLabel('Fuso das análises', { exact: true }).click();
  await page.getByLabel('Buscar cidade ou região').fill('UTC');
  await page.getByRole('button', { name: 'UTC', exact: true }).click();
}

test('Configurações tem contraste, foco, teclado, dois temas e reflow em 320px', async ({
  page,
}, info) => {
  const app = await api(page);
  await page.goto(url);
  await expect(
    page.getByLabel('Fuso das análises', { exact: true }),
  ).toBeEnabled();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`configuracoes-${theme}.png`),
      fullPage: true,
    });
  }
  const picker = page.getByLabel('Fuso das análises', { exact: true });
  await picker.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Buscar cidade ou região')).toBeFocused();
  await page.getByLabel('Buscar cidade ou região').fill('cidade inventada');
  await expect(
    page.getByText('Nenhum fuso encontrado.', { exact: false }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toBeFocused();
  await page.setViewportSize({ width: 320, height: 844 });
  await choose(page);
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Salvar fuso', exact: true }).click();
  await expect(
    page.getByText('Fuso salvo: UTC.', { exact: false }),
  ).toBeVisible();
  expect(app.writes).toEqual([{ csrf: true, body: { fuso_horario: 'UTC' } }]);
  await page.reload();
  await expect(picker).toContainText('UTC');
  await expect(
    page.getByRole('link', { name: 'Conexões', exact: true }),
  ).toHaveAttribute('href', '/configuracoes/conexoes?casa=7&apagadas=1');
});

test('modo de leitura mantém preferências e navegação; storage bloqueado permite trocar tema', async ({
  page,
}) => {
  const app = await api(page, 'READ_ONLY');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Bloqueado');
      },
    });
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('Bloqueado');
      },
    });
  });
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Sua conta está em modo de leitura' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Fuso das análises', { exact: true }),
  ).toBeDisabled();
  await page
    .locator('main.configuracoes')
    .getByRole('radio', { name: 'Escuro', exact: true })
    .check();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await page.getByRole('button', { name: 'Consultar fuso salvo' }).click();
  await expect(
    page.getByText('Fuso atual confirmado:', { exact: false }),
  ).toBeVisible();
  expect(app.writes).toHaveLength(0);
  await page.getByRole('link', { name: 'Alterar senha', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Alterar senha', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('destino')).toBe(url);
});

test('422 e 402 preservam entrada; mensagem privada nunca aparece e PATCH não ganha retry', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(url);
  await choose(page);
  app.respond((route) =>
    route.fulfill({
      status: 422,
      json: {
        detail: [
          {
            loc: ['body', 'fuso_horario'],
            input: 'PRIVATE',
            msg: 'PRIVATE',
            ctx: { value: 'PRIVATE' },
          },
        ],
      },
      headers,
    }),
  );
  await page.getByRole('button', { name: 'Salvar fuso', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('PRIVATE')).toHaveCount(0);
  await page.getByRole('button', { name: 'Confira Fuso das análises' }).click();
  await expect(
    page.getByLabel('Fuso das análises', { exact: true }),
  ).toBeFocused();
  app.respond((route) =>
    route.fulfill({
      status: 402,
      json: { detail: 'account_read_only' },
      headers,
    }),
  );
  await page.getByRole('button', { name: 'Salvar fuso', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Este pedido foi bloqueado para escrita',
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Fuso das análises', { exact: true }),
  ).toContainText('UTC');
  expect(app.writes).toHaveLength(2);
});

test('resposta desconhecida exige consulta; 503 com Retry-After não permite repetição antecipada', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(url);
  await choose(page);
  app.respond((route) => route.abort('connectionfailed'));
  await page.getByRole('button', { name: 'Salvar fuso', exact: true }).click();
  await expect(
    page.getByText('Confira o fuso salvo antes de fazer uma nova alteração.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Salvar fuso', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Consultar fuso salvo' }).click();
  await expect(
    page.getByRole('button', { name: 'Salvar fuso', exact: true }),
  ).toBeEnabled();
  expect(app.writes).toHaveLength(1);
  const before = app.reads.length;
  app.read((route) =>
    route.fulfill({
      status: 503,
      json: {},
      headers: { ...headers, 'Retry-After': '121' },
    }),
  );
  await page.getByRole('button', { name: 'Consultar fuso salvo' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'O serviço está temporariamente indisponível',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Consultar fuso salvo' }),
  ).toBeDisabled();
  expect(app.reads).toHaveLength(before + 1);
  await expect(
    page.getByText('Salvo na conta:', { exact: false }),
  ).toContainText('America / Sao Paulo');
});

test('fixture permanece separada e endereço da demonstração não libera sessão no build público', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4179/configuracoes');
  await expect(
    page.getByText('Demonstração isolada:', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Configurações', exact: true }),
  ).toBeVisible();
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { VITE_API_URL: 'http://127.0.0.1:4179' } }),
  );
  await page.goto('/configuracoes?session=true&fixture=1');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login\?destino=/);
  await expect(
    page.getByRole('heading', { name: 'Configurações', exact: true }),
  ).toHaveCount(0);
});
