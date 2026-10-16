import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('ajuda pública separa canais, preserva filtros e funciona por teclado sem sessão', async ({
  page,
}, info) => {
  const privateRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') || path.startsWith('/auth/'))
      privateRequests.push(path);
  });
  await page.goto('/tutorial?casa=7&apagadas=1');
  await expect(
    page.getByRole('heading', { name: 'Tutorial', exact: true }),
  ).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Assuntos do tutorial' });
  for (const [label, heading, action, channel] of [
    ['Prints', 'Prints', 'Enviar Prints', 'prints'],
    ['Planilha', 'Planilha', 'Importar planilha', 'planilha'],
    ['Nova aposta', 'Nova aposta', 'Abrir Nova aposta', ''],
    ['Bot do Telegram', 'Bot do Telegram', 'Abrir Conexões', ''],
    ['Excel do Painel', 'Excel do Painel', 'Abrir Painel para exportar', ''],
    ['Export do Telegram', 'Export do Telegram', 'Abrir Enviar', ''],
  ]) {
    await nav.getByRole('link', { name: new RegExp(`^${label}`) }).focus();
    await page.keyboard.press('Enter');
    const region = page.getByRole('region', { name: heading, exact: true });
    await expect(region).toBeFocused();
    const href = await region
      .getByRole('link', { name: action, exact: true })
      .getAttribute('href');
    const target = new URL(href!, 'http://site.example');
    expect(target.searchParams.get('casa')).toBe('7');
    expect(target.searchParams.get('apagadas')).toBe('1');
    expect(target.searchParams.get('entrada') ?? '').toBe(channel);
  }
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`tutorial-${theme}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole('navigation', { name: 'Ajuda pública' })
    .getByRole('link', { name: 'Extensão', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'O download ainda não está disponível' }),
  ).toBeVisible();
  await expect(page.locator('a[download]')).toHaveCount(0);
  await expect(page.locator('a[href*="t.me"]')).toHaveCount(0);
  expect(privateRequests).toEqual([]);
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`extensao-${theme}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Como importar uma planilha' }).click();
  await expect(
    page.getByRole('region', { name: 'Planilha', exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('link', { name: 'Importar planilha', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  const destination = new URL(page.url()).searchParams.get('destino')!;
  expect(
    new URL(destination, 'http://site.example').searchParams.get('entrada'),
  ).toBe('planilha');
  expect(
    new URL(destination, 'http://site.example').searchParams.get('casa'),
  ).toBe('7');
});

test('Excel é baixado na área privada e a ajuda conserva a seleção sem publicar os dados', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4181/painel?grupo=1&apagadas=todas');
  await page.getByRole('link', { name: 'Ajuda para exportar' }).click();
  await expect(
    page.getByRole('region', { name: 'Excel do Painel' }),
  ).toBeFocused();
  expect(new URL(page.url()).searchParams.get('grupo')).toBe('1');
  await page.getByRole('link', { name: 'Abrir Painel para exportar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Painel', exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Painel em Excel' }).click();
  expect((await download).suggestedFilename()).toBe('painel.xlsx');
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('todas');
});
