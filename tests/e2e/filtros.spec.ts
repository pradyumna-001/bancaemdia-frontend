import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = 'http://127.0.0.1:4175/testes/filtros';
test('filtros, pílulas, histórico, reload e escopo de outra área', async ({
  page,
}, testInfo) => {
  await page.goto(
    fixture + '?estado=GREEN&grupo=8&page=NaN&page_size=999&extra=keep',
  );
  await expect(page.getByText(/Filtros inválidos/)).toBeVisible();
  await expect(page.getByLabel('Consulta normalizada')).toContainText(
    '"page_size":50',
  );
  await page.getByRole('button', { name: 'Estado Green' }).click();
  const state = page.getByRole('dialog', { name: 'Estado', exact: true });
  await expect(state).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await state.getByRole('button', { name: 'Red', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Estado Red' })).toBeFocused();
  expect(new URL(page.url()).searchParams.get('estado')).toBe('RED');
  await page.goBack();
  await expect(
    page.getByRole('button', { name: 'Estado Green' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Casa Sem filtro' }).click();
  await page
    .getByRole('dialog', { name: 'Casa', exact: true })
    .getByRole('button', { name: 'Casa de teste' })
    .click();
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await page.reload();
  expect(new URL(page.url()).searchParams.get('page')).toBe('2');
  expect(new URL(page.url()).searchParams.get('grupo')).toBe('8');
  await page.getByRole('link', { name: 'Outra área' }).click();
  await expect(
    page.getByText(/Esta área não aplica: Grupo, Estado/),
  ).toBeVisible();
  await expect(page.getByLabel('Consulta normalizada')).not.toContainText(
    'estado',
  );
  await page.getByRole('button', { name: 'Remover filtro Grupo' }).click();
  expect(new URL(page.url()).searchParams.has('grupo')).toBe(false);
  expect(new URL(page.url()).searchParams.get('extra')).toBe('keep');
  await page.getByRole('link', { name: 'Outra área' }).click();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('filtros-' + theme + '.png'),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator('select,input[type=date]').count()).toBe(0);
});
test('datas próprias, teclado, Escape e fronteira exclusiva no servidor', async ({
  page,
}, testInfo) => {
  await page.goto(fixture + '?desde=2018-11-04&ate=2018-11-04');
  await expect(page.getByLabel('Consulta normalizada')).toContainText(
    '"desde":"2018-11-04T03:00:00.000Z"',
  );
  await expect(page.getByLabel('Consulta normalizada')).toContainText(
    '"ate":"2018-11-05T02:00:00.000Z"',
  );
  await page
    .getByRole('button', { name: 'De 4 de novembro de 2018', exact: true })
    .click();
  const date = page.getByRole('dialog', { name: 'De', exact: true });
  await expect(
    date.getByRole('button', { name: 'Selecionar 4 de novembro de 2018' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    date.getByRole('button', { name: 'Selecionar 5 de novembro de 2018' }),
  ).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(date.getByText('dezembro de 2018')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('calendario.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(date).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'De 4 de novembro de 2018', exact: true }),
  ).toBeFocused();
  expect(new URL(page.url()).searchParams.get('desde')).toBe('2018-11-04');
});
test('somente apagadas bloqueia, sem remover estado silenciosamente; fixture fora do build público', async ({
  page,
}) => {
  await page.goto(fixture + '?apagadas=1&conta=7&origem=telegram');
  await expect(page.getByRole('alert')).toContainText('somente apagadas');
  await expect(page.getByLabel('Consulta normalizada')).toHaveText('null');
  await page.reload();
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
  await page
    .getByRole('button', { name: 'Remover filtro Visibilidade' })
    .click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Consulta normalizada')).toContainText(
    '"incluir_apagadas":false',
  );
  await page.goto('/testes/filtros?apagadas=1');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Estado/ })).toHaveCount(0);
});
