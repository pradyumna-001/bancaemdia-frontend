import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { billingStatus } from '../fixtures/acesso';
import {
  linkedTelegram,
  unlinkedTelegram,
  temporaryTelegramCode,
} from '../fixtures/telegram';
const headers = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Retry-After',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};
async function api(page: Page) {
  let status = unlinkedTelegram as
    typeof linkedTelegram | typeof unlinkedTelegram;
  let get = (route: Route) => route.fulfill({ json: status, headers });
  let mutation = async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      status = unlinkedTelegram;
      return route.fulfill({ json: { revoked: true }, headers });
    }
    return route.fulfill({
      status: 201,
      json: temporaryTelegramCode(),
      headers,
    });
  };
  const writes: Array<{ method: string; csrf: boolean; body: string | null }> =
    [];
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
      return route.fulfill({
        json: { ...billingStatus, access: 'READ_ONLY' },
        headers,
      });
    if (path === '/api/v1/telegram/link' && req.method() === 'GET') {
      reads.push(path);
      return get(route);
    }
    if (path.startsWith('/api/v1/telegram/')) {
      writes.push({
        method: req.method(),
        csrf: !!req.headers()['x-csrf-token'],
        body: req.postData(),
      });
      return mutation(route);
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
    writes,
    reads,
    status: (next: typeof status) => {
      status = next;
    },
    read: (next: typeof get) => {
      get = next;
    },
    respond: (next: typeof mutation) => {
      mutation = next;
    },
  };
}
const url = '/configuracoes/conexoes?casa=7&apagadas=1';
const generate = (page: Page) =>
  page.getByRole('button', { name: 'Gerar código temporário' });
const consult = (page: Page) =>
  page.getByRole('button', { name: 'Consultar vínculo' });
test('conexão legível nos dois temas, link fictício explícito, foco, teclado e 320px', async ({
  page,
}, info) => {
  const app = await api(page);
  await page.goto(url);
  await expect(
    page.getByRole('heading', { name: 'Telegram não conectado' }),
  ).toBeVisible();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    await generate(page).hover();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await info.attach(`telegram-inicial-${theme}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
  await expect(
    page.getByRole('link', { name: 'Abrir bot do bancaemdia (link fictício)' }),
  ).toHaveAttribute('href', '#telegram-bot-lancamento');
  await page
    .getByRole('link', { name: 'Abrir bot do bancaemdia (link fictício)' })
    .click();
  await expect(page).toHaveURL(/casa=7&apagadas=1#telegram-bot-lancamento$/);
  await expect(page.getByText(/Este link é ilustrativo/)).toBeVisible();
  await generate(page).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Seu comando de conexão' }),
  ).toBeFocused();
  await expect(page.getByText('/vincular ABCDEFGH')).toBeVisible();
  expect(app.writes).toEqual([{ method: 'POST', csrf: true, body: null }]);
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate((value) => {
      document.documentElement.setAttribute('data-tema', value);
      scrollTo(0, 0);
    }, theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await info.attach(`telegram-codigo-${theme}`, {
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
  await expect(page.locator('select,input[type=date]')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain('ABCDEFGH');
  expect(page.url()).not.toContain('ABCDEFGH');
});
test('copiar é explícito, esconder/saída apagam comando e novo código exige confirmação', async ({
  page,
}) => {
  const app = await api(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.goto(url);
  await generate(page).click();
  await page.getByRole('button', { name: 'Copiar comando' }).click();
  await expect(page.getByText('Comando copiado.')).toBeVisible();
  await page
    .getByRole('button', { name: 'Ocultar código e parar consulta' })
    .click();
  await expect(page.getByText('/vincular ABCDEFGH')).toHaveCount(0);
  await page.getByRole('button', { name: 'Preparar novo código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Gerar um novo código?' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(
    page.getByRole('button', { name: 'Preparar novo código' }),
  ).toBeFocused();
  expect(app.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Preparar novo código' }).click();
  await page.getByRole('button', { name: 'Confirmar novo código' }).click();
  await expect(page.getByText('/vincular ABCDEFGH')).toBeVisible();
  expect(app.writes).toHaveLength(2);
  await page
    .getByRole('link', { name: 'Importar histórico em Enviar' })
    .click();
  await expect(page).toHaveURL(/\/enviar\?casa=7&apagadas=1$/);
  await expect(page.getByText('/vincular ABCDEFGH')).toHaveCount(0);
  await page.getByLabel('Arquivo do export', { exact: true }).setInputFiles({
    name: 'result.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  await page
    .getByRole('link', { name: 'confira a conexão com o Telegram' })
    .click();
  await expect(page.getByText('/vincular ABCDEFGH')).toHaveCount(0);
});
test('vínculo e revogação confirmados mantêm null e preservam registros', async ({
  page,
}, info) => {
  const app = await api(page);
  await page.goto(url);
  await generate(page).click();
  await expect(page.getByText('/vincular ABCDEFGH')).toBeVisible();
  app.status(linkedTelegram);
  await consult(page).click();
  await expect(
    page.getByRole('heading', { name: 'Telegram conectado' }),
  ).toBeVisible();
  await expect(page.getByText('/vincular ABCDEFGH')).toHaveCount(0);
  await expect(page.getByText('Não informado')).toBeVisible();
  await page.getByRole('button', { name: 'Revogar vínculo' }).click();
  await expect(
    page.getByText(/apostas já registradas permanecem/),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.evaluate(() => scrollTo(0, 0));
  await info.attach('telegram-revogacao', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Voltar' }).click();
  expect(app.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Revogar vínculo' }).click();
  await page.getByRole('button', { name: 'Confirmar revogação' }).click();
  await expect(
    page.getByText('Vínculo revogado. Códigos anteriores foram invalidados.'),
  ).toBeVisible();
  expect(app.writes[1]).toEqual({ method: 'DELETE', csrf: true, body: null });
});
test('expiração remove segredo e polling para sem replay ou laço de GET', async ({
  page,
}) => {
  await page.clock.install();
  const app = await api(page);
  await page.goto(url);
  await generate(page).click();
  await expect(page.getByText('/vincular ABCDEFGH')).toBeVisible();
  await page.clock.runFor(6000);
  await expect.poll(() => app.reads.length).toBeGreaterThan(1);
  await page.clock.runFor(115000);
  await expect(consult(page)).toBeEnabled();
  const count = app.reads.length;
  await page.clock.runFor(30000);
  expect(app.reads).toHaveLength(count);
  await expect(
    page.getByText(/consulta automática está pausada/),
  ).toBeVisible();
  await page.clock.runFor(30 * 60 * 1000);
  await expect(page.getByText('/vincular ABCDEFGH')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Preparar novo código' }),
  ).toBeVisible();
  expect(app.writes).toHaveLength(1);
});
test('422 seguro e Retry-After impedem repetição sem apagar estado confirmado', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(url);
  app.respond((route) =>
    route.fulfill({
      status: 422,
      json: {
        detail: [
          {
            loc: ['body', 'PRIVATE_FIELD'],
            msg: 'PRIVATE_MESSAGE',
            input: 'PRIVATE_CODE',
          },
        ],
      },
      headers,
    }),
  );
  await generate(page).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText(/PRIVATE_/)).toHaveCount(0);
  expect(app.writes).toHaveLength(1);
  app.respond((route) =>
    route.fulfill({
      status: 429,
      json: { detail: 'PRIVATE' },
      headers: { ...headers, 'Retry-After': '61' },
    }),
  );
  await generate(page).click();
  await expect(
    page.getByRole('heading', { name: 'Aguarde para tentar novamente' }),
  ).toBeVisible();
  await expect(generate(page)).toBeDisabled();
  expect(app.writes).toHaveLength(2);
  app.read((route) =>
    route.fulfill({
      status: 429,
      json: { detail: 'PRIVATE' },
      headers: { ...headers, 'Retry-After': '61' },
    }),
  );
  await consult(page).click();
  await expect(consult(page)).toBeDisabled();
  await expect(page.getByText(/última consulta confirmada/)).toBeVisible();
});
test('resposta desconhecida exige consulta e nova intenção; não reenvia a emissão', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(url);
  app.respond((route) => route.abort('connectionfailed'));
  await generate(page).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(generate(page)).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Preparar novo código' }),
  ).toBeDisabled();
  await consult(page).click();
  await expect(
    page.getByRole('button', { name: 'Preparar novo código' }),
  ).toBeEnabled();
  expect(app.writes).toHaveLength(1);
  app.respond((route) =>
    route.fulfill({ status: 201, json: temporaryTelegramCode(), headers }),
  );
  await page.getByRole('button', { name: 'Preparar novo código' }).click();
  await page.getByRole('button', { name: 'Confirmar novo código' }).click();
  await expect(page.getByText('/vincular ABCDEFGH')).toBeVisible();
  expect(app.writes).toHaveLength(2);
});
test('Configurações preserva contexto e build público não possui fixture/bypass', async ({
  page,
}) => {
  await api(page);
  await page.goto('/configuracoes?casa=7&apagadas=1');
  await page.getByRole('link', { name: 'Conexão com o Telegram' }).click();
  await expect(page).toHaveURL(/\/configuracoes\/conexoes\?casa=7&apagadas=1$/);
  await page.goto('/testes/telegram?session=true');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await expect(page.getByText('/vincular ABCDEFGH')).toHaveCount(0);
});
