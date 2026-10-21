import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { printItem, printIntent } from '../fixtures/prints';

const fixture = 'http://127.0.0.1:4204/enviar?entrada=prints&casa=7&apagadas=1';
const image = readFileSync('tests/fixtures/midia/foto.png');

test('build público não aceita sessão simulada pelo endereço da fixture de prints', async ({
  page,
}) => {
  await page.goto(fixture);
  await expect(
    page.getByRole('heading', { name: 'Enviar prints', exact: true }),
  ).toBeVisible();
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { VITE_API_URL: 'http://127.0.0.1:4204' } }),
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
    'http://127.0.0.1:4173/enviar?entrada=prints&session=true&fixture=http://127.0.0.1:4204',
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Enviar prints', exact: true }),
  ).toHaveCount(0);
});

test('prints: prévias, teclado, resultados por arquivo, reload GET, temas/axe e 320px', async ({
  page,
}, testInfo) => {
  const received = new Map<string, ReturnType<typeof printItem>>();
  let writes = 0;
  await page.route('**/api/v1/prints/intencoes/**', async (route) => {
    const parts = new URL(route.request().url()).pathname.split('/');
    const intent_id = parts[5]!,
      item_id = parts[7];
    if (route.request().method() === 'POST') {
      writes++;
      expect(route.request().headers()['content-type']).toContain(
        'multipart/form-data',
      );
      expect(route.request().headers()['x-csrf-token']).toBeTruthy();
      expect(
        route.request().postDataBuffer()?.includes(Buffer.from('filename=')),
      ).toBe(true);
      const value = printItem({
        intent_id,
        item_id: item_id!,
        status: 'completed',
        outcome:
          writes === 1 ? 'materialized' : writes === 2 ? 'duplicate' : 'review',
        duplicate: writes === 2,
        progress_percent: 100,
        results: [
          {
            type: writes === 3 ? 'review' : 'materialized',
            bet_key: writes === 3 ? null : 'demo',
            review_ids: writes === 3 ? [1] : [],
          },
        ],
      });
      received.set(value.item_id, value);
      return route.fulfill({ status: 202, json: value });
    }
    if (item_id)
      return route.fulfill({
        json: received.get(item_id),
        status: received.has(item_id) ? 200 : 404,
      });
    return received.size
      ? route.fulfill({
          json: printIntent([...received.values()], {
            intent_id,
            state: 'complete',
          }),
        })
      : route.fulfill({ status: 404, json: { detail: 'ausente' } });
  });
  await page.goto(fixture);
  await expect(
    page.getByRole('heading', { name: 'Enviar prints', exact: true }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`prints-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByLabel('Imagens dos bilhetes').setInputFiles(
    ['primeiro.png', 'repetido.png', 'terceiro.png'].map((name) => ({
      name,
      mimeType: 'image/png',
      buffer: image,
    })),
  );
  await expect(page.getByRole('img', { name: /^Prévia de / })).toHaveCount(3);
  await expect(page.getByText(/Imagem repetida na seleção/)).toHaveCount(2);
  expect(writes).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath('prints-selecao.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Enviar prints selecionados' })
    .focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Apostas registradas', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Print já recebido', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Precisa de Revisão', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(3);
  expect(new URL(page.url()).searchParams.get('casa')).toBe('7');
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('prints-resultado.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByText('Print já recebido', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(3);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Escolher novos prints' }).click();
  await expect(page.getByText(/Nenhum print escolhido/)).toBeVisible();
});

test('prints: resposta perdida e reconciliação sem replay', async ({
  page,
}) => {
  let writes = 0;
  let remote: ReturnType<typeof printItem> | undefined;
  await page.route('**/api/v1/prints/intencoes/**', async (route) => {
    const parts = new URL(route.request().url()).pathname.split('/');
    if (route.request().method() === 'POST') {
      writes++;
      remote = printItem({
        intent_id: parts[5]!,
        item_id: parts[7]!,
        status: 'completed',
        outcome: 'no_bet',
        results: [],
        progress_percent: 100,
      });
      return route.abort('failed');
    }
    if (parts[7] && remote) return route.fulfill({ json: remote });
    return route.fulfill({ status: 404, json: { detail: 'ausente' } });
  });
  await page.goto(fixture);
  await page
    .getByLabel('Imagens dos bilhetes')
    .setInputFiles({ name: 'print.png', mimeType: 'image/png', buffer: image });
  await page
    .getByRole('button', { name: 'Enviar prints selecionados' })
    .click();
  await expect(
    page.getByText('Confira se o print foi recebido', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: 'Conferir print 1' }).click();
  await expect(
    page.getByText('Nenhuma aposta encontrada', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Enviar prints selecionados' }),
  ).toBeDisabled();
  expect(writes).toBe(1);
});
