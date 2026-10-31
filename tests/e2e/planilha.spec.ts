import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sourceId } from '../fixtures/planilha';
const fixture = `http://127.0.0.1:4206/enviar?entrada=planilha&fonte=${sourceId}&casa=7&apagadas=1`;

test('cadastro aguarda a consulta inicial e um clique registra a fonte', async ({
  page,
}, info) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let initial = true;
  let writes = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'PUT' &&
      request.url().includes('/api/v1/planilhas/fontes/')
    )
      writes++;
  });
  await page.route(
    (url) => url.pathname === '/api/v1/planilhas/fontes',
    async (route) => {
      if (!initial) return route.continue();
      initial = false;
      await pending;
      await route.fulfill({
        json: { data: [], total: 0, page: 1, page_size: 20 },
      });
    },
  );
  await page.goto(
    'http://127.0.0.1:4206/enviar?entrada=planilha&casa=7&apagadas=1',
  );
  await page
    .getByLabel('Nome da nova fonte', { exact: true })
    .fill('Fonte após consulta');
  const register = page.getByRole('button', {
    name: 'Registrar nova fonte',
    exact: true,
  });
  await expect(register).toBeDisabled();
  await expect(
    page.getByText('Consultando fontes…', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(0);
  expect(new URL(page.url()).searchParams.has('fonte')).toBe(false);
  await page.screenshot({
    path: info.outputPath('planilha-fonte-consulta.png'),
    fullPage: true,
  });
  release();
  await expect(register).toBeEnabled();
  await register.click();
  await expect(page.getByLabel('Arquivo XLSX', { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  expect(new URL(page.url()).searchParams.get('fonte')).toMatch(
    /^[\da-f-]{36}$/,
  );
  expect(new URL(page.url()).searchParams.get('casa')).toBe('7');
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
});
test('planilha: prévia, picker, confirmação, reload GET, temas, teclado e reflow', async ({
  page,
}, info) => {
  let writes = 0;
  page.on('request', (r) => {
    if (r.method() !== 'GET' && r.url().includes('/api/v1/planilhas/'))
      writes++;
  });
  await page.goto(fixture);
  await expect(
    page.getByRole('heading', { name: 'Importar planilha', exact: true }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.getByLabel('Arquivo XLSX', { exact: true }).setInputFiles({
    name: 'minhas-apostas.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('fixture: no XLSX parsing'),
  });
  await page
    .getByRole('button', { name: 'Conferir planilha', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Prévia pronta para conferir',
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('planilha-previa.png'),
    fullPage: true,
  });
  await page.getByText('Conferir ou corrigir colunas', { exact: true }).click();
  await page.getByRole('button', { name: /^Odd/ }).click();
  await page
    .getByRole('button', { name: 'Coluna 5 · stake_unidades', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Confirmar importação', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Gerar nova prévia', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Confirmar importação', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Confirmar importação', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Importação concluída', exact: true }),
  ).toBeVisible();
  expect(writes).toBe(3);
  expect(new URL(page.url()).searchParams.get('casa')).toBe('7');
  expect(new URL(page.url()).searchParams.get('fonte')).toBe(sourceId);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Importação concluída', exact: true }),
  ).toBeVisible();
  expect(writes).toBe(3);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator('select,input[type=date]').count()).toBe(0);
});
test('build público não libera sessão pela fixture de planilha', async ({
  page,
}) => {
  await page.goto(fixture);
  await expect(
    page.getByRole('heading', { name: 'Importar planilha', exact: true }),
  ).toBeVisible();
  await page.route('**/config.json', (r) =>
    r.fulfill({ json: { VITE_API_URL: 'http://127.0.0.1:4206' } }),
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
  await page.goto(
    'http://127.0.0.1:4173/enviar?entrada=planilha&session=true&fixture=http://127.0.0.1:4206',
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Importar planilha', exact: true }),
  ).toHaveCount(0);
});

test('seletor indisponível mantém contraste durante resultado desconhecido', async ({
  page,
}, info) => {
  let writes = 0;
  await page.route('**/api/v1/planilhas/confirmacoes/*', async (route) => {
    if (route.request().method() === 'POST') {
      writes++;
      await route.abort('failed');
    } else await route.continue();
  });
  await page.goto(fixture);
  await page.getByLabel('Arquivo XLSX', { exact: true }).setInputFiles({
    name: 'conferencia.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('fixture: no XLSX parsing'),
  });
  await page
    .getByRole('button', { name: 'Conferir planilha', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirmar importação', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Confira se o pedido foi concluído',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Arquivo XLSX', { exact: true })).toBeDisabled();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`planilha-indisponivel-${theme}.png`),
      fullPage: true,
    });
  }
  expect(writes).toBe(1);
});
