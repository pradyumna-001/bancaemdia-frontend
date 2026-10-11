import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const origin = 'http://127.0.0.1:4202';
const path = '/aposta/demo/foto?casa=7&apagadas=1';
test('foto privada: sob demanda, reserva, zoom, Escape e foco', async ({
  page,
}) => {
  let reads = 0;
  page.on('request', (req) => {
    if (req.url().endsWith('/api/v1/apostas/demo/foto')) reads++;
  });
  await page.goto(origin + path);
  const frame = page.locator('.foto-aposta-espaco');
  const before = await frame.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height, top: box.top + scrollY };
  });
  expect(reads).toBe(0);
  await page.getByRole('button', { name: 'Abrir foto' }).click();
  const img = page.getByRole('img', {
    name: 'Foto original vinculada a esta aposta',
    exact: true,
  });
  await expect(img).toBeVisible();
  await expect
    .poll(() =>
      img.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(800);
  expect(reads).toBe(1);
  expect(
    await frame.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, top: box.top + scrollY };
    }),
  ).toEqual(before);
  expect(await img.getAttribute('src')).toMatch(/^blob:/);
  expect(await img.getAttribute('loading')).toBe('lazy');
  const zoom = page.getByRole('button', { name: 'Ampliar foto' });
  await zoom.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(zoom).toBeFocused();
  await zoom.click();
  await page.getByRole('button', { name: 'Fechar foto ampliada' }).click();
  await expect(zoom).toBeFocused();
  await expect(
    page.getByRole('link', { name: 'Voltar para a aposta' }),
  ).toHaveAttribute('href', '/aposta/demo?casa=7&apagadas=1');
});
test('ausência segura mantém navegação e recorte', async ({ page }) => {
  await page.goto(origin + '/aposta/sem-foto/foto?apagadas=1');
  await page.getByRole('button', { name: 'Abrir foto' }).click();
  await expect(
    page.getByText('Não há foto disponível para consulta nesta aposta.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Voltar para Apostas' }),
  ).toHaveAttribute('href', '/?apagadas=1');
});
test('imagem inválida é removida sem erro de rota', async ({ page }) => {
  await page.route('**/api/v1/apostas/demo/foto', (route) =>
    route.fulfill({ contentType: 'image/png', body: 'corrompida' }),
  );
  await page.goto(origin + path);
  await page.getByRole('button', { name: 'Abrir foto' }).click();
  await expect(
    page.getByText('Não foi possível exibir esta imagem com segurança.'),
  ).toBeVisible();
  await expect(page.locator('.foto-aposta').getByRole('img')).toHaveCount(0);
});
test('falha de storage com Retry-After recupera sem laço infinito', async ({
  page,
}) => {
  let reads = 0;
  await page.route('**/api/v1/apostas/demo/foto', (route) => {
    reads++;
    return reads < 4
      ? route.fulfill({
          status: 503,
          headers: { 'Retry-After': '1' },
          json: { detail: 'sem segredo' },
        })
      : route.fulfill({
          contentType: 'image/png',
          body: readFileSync(
            new URL('../fixtures/midia/foto.png', import.meta.url),
          ),
        });
  });
  await page.goto(origin + path);
  await page.getByRole('button', { name: 'Abrir foto' }).click();
  await expect(page.locator('.foto-aposta').getByRole('img')).toBeVisible({
    timeout: 15000,
  });
  expect(reads).toBe(4);
});
test('mídia lenta reserva espaço e duplo toque não duplica', async ({
  page,
}) => {
  let reads = 0;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/apostas/demo/foto', async (route) => {
    reads++;
    await waiting;
    await route.continue();
  });
  await page.goto(origin + path);
  const frame = page.locator('.foto-aposta-espaco');
  const before = await frame.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height, top: box.top + scrollY };
  });
  await page.getByRole('button', { name: 'Abrir foto' }).dblclick();
  await expect(page.getByRole('button', { name: 'Abrir foto' })).toBeDisabled();
  expect(
    await frame.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, top: box.top + scrollY };
    }),
  ).toEqual(before);
  release();
  await expect(page.locator('.foto-aposta').getByRole('img')).toBeVisible();
  expect(reads).toBe(1);
});
test('contraste, temas, teclado e reflow nos estados da foto', async ({
  page,
}, testInfo) => {
  await page.goto(origin + path);
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.tema = value;
    }, theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.getByRole('button', { name: 'Abrir foto' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.foto-aposta').getByRole('img')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('foto.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Ampliar foto' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('build público exige sessão inclusive na origem da demonstração', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:8000/**', (route) =>
    route.fulfill({
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { detail: 'sessão necessária' },
    }),
  );
  await page.goto(
    'http://127.0.0.1:4173' +
      path +
      '&VITE_API_URL=' +
      encodeURIComponent(origin),
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.foto-aposta').getByRole('img')).toHaveCount(0);
});
