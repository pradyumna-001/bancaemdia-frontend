import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ABAS } from '../../src/app/nav';

test('shell preserva filtros, mostra fila e navega com menus acessíveis', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.endsWith('mobile');
  await page.route('**/api/v1/revisao/stats', (route) =>
    route.fulfill({
      json: {
        total: 12,
        por_motivo: {},
        idade_maxima_segundos: 0,
        mais_antiga_em: null,
      },
    }),
  );
  await page.goto('http://127.0.0.1:4175/?apagadas=1&casa=teste');
  await expect(page.getByRole('note')).toContainText('Cópia de teste');
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Navegação principal no celular' : 'Navegação principal',
    exact: true,
  });
  await expect(
    nav.getByRole('link', { name: /Revisão.*12 pendências/ }),
  ).toBeVisible();
  await expect(
    nav.getByRole('link', { name: 'Apostas', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Pular para o conteúdo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
  for (const tema of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Mais opções' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('radio', { name: tema, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('menu-' + tema + '.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Opções', exact: true }),
    ).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('shell-' + tema + '.png'),
      fullPage: true,
    });
  }
  if (mobile)
    await nav.getByRole('button', { name: 'Mais', exact: true }).click();
  const destinos = mobile ? page.getByRole('dialog') : nav;
  await destinos.getByRole('link', { name: 'Caixa', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Caixa', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).search).toBe('?apagadas=1&casa=teste');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#conteudo')).toBeFocused();
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Apostas', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // O menu e a barra juntos derivam todas as abas do mesmo catálogo.
  await page.getByRole('button', { name: 'Opções', exact: true }).click();
  for (const aba of ABAS) {
    const area = (mobile ? !aba.mobile : !aba.desktop)
      ? page.getByRole('dialog')
      : nav;
    // Com o diálogo aberto os outros links ficam inertes, mas continuam no DOM.
    expect(await area.locator('a').filter({ hasText: aba.title }).count()).toBe(
      1,
    );
  }
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Contas e titulares', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Contas e titulares', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).search).toBe('?apagadas=1&casa=teste');
  await page.getByRole('button', { name: 'Opções', exact: true }).click();
  const opcoes = page.getByRole('dialog');
  await expect(
    opcoes.getByRole('link', { name: 'Contas e titulares', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await opcoes.getByRole('link', { name: 'Assinatura', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Assinatura', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Opções', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Calculadoras', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Calculadoras', exact: true }),
  ).toBeVisible();
});

test('fila vazia, erro e recuperação não fabricam contador nem bloqueiam navegação', async ({
  page,
}, testInfo) => {
  let falha = true;
  await page.route('**/api/v1/revisao/stats', (route) =>
    falha
      ? route.fulfill({ status: 422, json: {} })
      : route.fulfill({
          json: {
            total: 0,
            por_motivo: {},
            idade_maxima_segundos: 0,
            mais_antiga_em: null,
          },
        }),
  );
  await page.goto('http://127.0.0.1:4175/?ambiente=production');
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível atualizar',
  );
  await expect(page.getByRole('note')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Revisão/ })).toHaveCount(0);
  falha = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Revisão/ })).toHaveCount(0);
  if (testInfo.project.name.endsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByRole('button', { name: 'Mais', exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('menu-320.png'),
      fullPage: true,
    });
  }
});

test('build público não permite abrir a sessão simulada', async ({ page }) => {
  for (const fixture of ['shell', 'enviar']) {
    await page.goto(`/tests/fixtures/${fixture}/index.html`);
    await expect(
      page.getByRole('heading', { name: 'Não achei esta página' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', {
        name: 'Navegação principal',
        exact: true,
      }),
    ).toHaveCount(0);
  }
});
