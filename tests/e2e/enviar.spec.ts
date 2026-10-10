import AxeBuilder from '@axe-core/playwright';
import { billingStatus } from '../fixtures/acesso';
import { expect, test, type Page } from '@playwright/test';
import {
  acceptedUpload,
  partialUpload,
  betsWithUnknownValues,
} from '../fixtures/api/responses';

const fixture = 'http://127.0.0.1:4176/enviar?estado=GREEN&apagadas=1';
async function identity(page: Page) {
  let access: 'FULL_WRITE' | 'READ_ONLY' = 'FULL_WRITE';
  await page.route('**/api/v1/billing/status', (route) =>
    route.fulfill({ json: { ...billingStatus, access } }),
  );
  const session = {
    usuario_id: 1,
    nome: 'Teste',
    email: 'teste@example.org',
    session_version: `${crypto.randomUUID()}:1`,
    csrf_token: crypto.randomUUID(),
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
    refresh_required: false,
  };
  await page.route('**/auth/session', (route) =>
    route.fulfill({ json: session }),
  );
  return {
    readOnly: () => {
      access = 'READ_ONLY';
    },
  };
}
async function select(page: Page, name = 'result.json') {
  await page.getByLabel('Arquivo do export', { exact: true }).setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
}

test('seleção, multipart único, progresso real e retorno por URL; temas, teclado, axe e 320px', async ({
  page,
}, testInfo) => {
  await identity(page);
  let writes = 0,
    reads = 0;
  await page.route('**/api/v1/upload', async (route) => {
    writes++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-csrf-token']).toBeTruthy();
    expect(route.request().headers()['content-type']).toContain(
      'multipart/form-data',
    );
    expect(route.request().postData()).toContain('filename="result.json"');
    await route.fulfill({
      status: 202,
      json: {
        ...acceptedUpload,
        aviso: 'PRIVATE_WARNING',
        estimated_cost_usd: 55,
      },
    });
  });
  await page.route(`**/api/v1/upload/${acceptedUpload.job_id}`, (route) => {
    reads++;
    return route.fulfill({
      json:
        reads === 1
          ? {
              ...partialUpload,
              status: 'processing',
              progress: { ...partialUpload.progress, percent: 30 },
            }
          : partialUpload,
    });
  });
  await page.goto(fixture);
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`enviar-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByLabel('Arquivo do export', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await select(page);
  await page.getByRole('button', { name: 'Enviar export' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Processando', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Progresso 30%')).toHaveAttribute('value', '30');
  await expect(
    page.getByRole('heading', { name: 'Importação concluída com pendências' }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(page.url()).toContain('estado=GREEN&apagadas=1&envio=');
  await expect(
    page.getByText(/PRIVATE_WARNING|Autorizar|estimativa|custo/i),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('enviar-parcial.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Importação concluída com pendências' }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Escolher outro arquivo' }).click();
  expect(new URL(page.url()).searchParams.get('estado')).toBe('GREEN');
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
});

test('resposta perdida exige consulta GET e nova seleção; nenhum replay ao recarregar', async ({
  page,
}) => {
  await identity(page);
  let writes = 0,
    reads = 0;
  await page.route('**/api/v1/upload', (route) => {
    writes++;
    return route.abort('failed');
  });
  await page.route('**/api/v1/apostas*', (route) => {
    reads++;
    return route.fulfill({ json: betsWithUnknownValues });
  });
  await page.goto(fixture);
  await select(page);
  await page.getByRole('button', { name: 'Enviar export' }).click();
  await expect(
    page.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Conferir resultado' }).click();
  await expect(page.getByText(/Consulta atualizada/)).toBeVisible();
  expect(writes).toBe(1);
  expect(reads).toBe(1);
  await page.getByRole('button', { name: 'Iniciar um novo envio' }).click();
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  await page.reload();
  expect(writes).toBe(1);
});

test('413, formato, 422, leitura e cooldown preservam entrada e têm recuperação', async ({
  page,
}) => {
  const permission = await identity(page);
  let status = 413,
    writes = 0;
  await page.route('**/api/v1/upload', (route) => {
    if (status === 402) permission.readOnly();
    writes++;
    return route.fulfill({
      status,
      headers: status === 429 ? { 'Retry-After': '300' } : {},
      json:
        status === 402
          ? { detail: 'account_read_only' }
          : {
              detail: [
                { loc: ['body', 'file'], input: 'PRIVATE', msg: 'TRACE' },
              ],
            },
    });
  });
  await page.goto(fixture);
  await select(page, 'errado.html');
  await expect(page.getByRole('alert')).toContainText('ZIP ou JSON');
  expect(writes).toBe(0);
  await select(page);
  for (const next of [413, 422, 429]) {
    status = next;
    await page.getByRole('button', { name: 'Enviar export' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(
      page.getByText('Arquivo escolhido: result.json'),
    ).toBeVisible();
    if (next !== 429) {
      await page.getByRole('button', { name: 'Revisar pedido' }).click();
      await expect(
        page.getByLabel('Arquivo do export', { exact: true }),
      ).toBeFocused();
    }
  }
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  expect(writes).toBe(3);
  await expect(page.getByText(/PRIVATE|TRACE/)).toHaveCount(0);
  await page.reload();
  status = 402;
  await select(page);
  await page.getByRole('button', { name: 'Enviar export' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sua conta está em modo de leitura' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('UUID inválido e estados vazio, falha e limite não ficam sem saída', async ({
  page,
}) => {
  await identity(page);
  let status = 'completed';
  await page.route(`**/api/v1/upload/${acceptedUpload.job_id}`, (route) =>
    route.fulfill({
      json: {
        ...partialUpload,
        status,
        bets_processed: 0,
        bets_failed: 0,
        progress: {
          total: 0,
          pending: 0,
          read: 0,
          failed: 0,
          ignored: 1,
          over_limit: 0,
          percent: 100,
        },
      },
    }),
  );
  await page.goto(fixture + '&envio=inválido');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível identificar o envio' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Escolher outro arquivo' }).click();
  await page.goto(fixture + '&envio=' + acceptedUpload.job_id);
  await expect(
    page.getByRole('heading', { name: 'Nenhuma aposta foi importada' }),
  ).toBeVisible();
  status = 'failed';
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'O processamento não foi concluído' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Conferir resultado' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Escolher outro arquivo' }),
  ).toBeVisible();
});

test('pausar e voltar acompanham somente GET, sem cancelamento remoto', async ({
  page,
}) => {
  await identity(page);
  let reads = 0,
    writes = 0;
  await page.route('**/api/v1/upload/**', (route) => {
    if (route.request().method() !== 'GET') writes++;
    reads++;
    return route.fulfill({ json: { ...partialUpload, status: 'processing' } });
  });
  await page.goto(fixture + '&envio=' + acceptedUpload.job_id);
  await expect(
    page.getByRole('heading', { name: 'Processando', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pausar acompanhamento' }).click();
  await expect(
    page.getByRole('heading', { name: 'Acompanhamento pausado' }),
  ).toBeVisible();
  const stopped = reads;
  await page.waitForTimeout(2200);
  expect(reads).toBe(stopped);
  await page.getByRole('button', { name: 'Continuar acompanhamento' }).click();
  await expect(
    page.getByRole('heading', { name: 'Processando', exact: true }),
  ).toBeVisible();
  expect(writes).toBe(0);
});

test('consulta da mesma sessão durante POST bloqueia reenvio e descarta confirmação tardia', async ({
  page,
}) => {
  await identity(page);
  let writes = 0;
  let finish!: () => void;
  await page.route('**/api/v1/upload', async (route) => {
    writes++;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    await route.fulfill({ status: 202, json: acceptedUpload });
  });
  await page.goto(fixture);
  await select(page);
  await page.getByRole('button', { name: 'Enviar export' }).click();
  await expect.poll(() => writes).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(
    page.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
  ).toBeVisible();
  finish();
  await expect(
    page.getByRole('button', { name: 'Enviar export' }),
  ).toBeDisabled();
  await expect(page.getByText('Arquivo escolhido: result.json')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('envio')).toBe(false);
  expect(writes).toBe(1);
});
