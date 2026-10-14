import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { betsWithUnknownValues } from '../fixtures/api/responses';
const fixture =
  'http://127.0.0.1:4175/testes/recuperacao?estado=PENDENTE&apagadas=1';

test('401 e 402 mantêm entrada e filtros, com destinos diferentes e sem reenvio', async ({
  page,
}, testInfo) => {
  let status = 401;
  let writes = 0;
  await page.route('**/api/v1/apostas*', async (route) => {
    if (route.request().method() === 'POST') {
      writes++;
      await route.fulfill({ status, json: { detail: 'PRIVATE_TRACE' } });
    } else await route.fulfill({ json: betsWithUnknownValues });
  });
  await page.goto(fixture);
  await page.getByLabel('Odd', { exact: true }).fill('3.25');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Entre novamente para continuar' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Entrar novamente/ }),
  ).toHaveAttribute('target', '_blank');
  await expect(page.getByLabel('Odd', { exact: true })).toHaveValue('3.25');
  expect(writes).toBe(1);
  status = 402;
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Este pedido foi bloqueado para escrita',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Ver assinatura/ }),
  ).toHaveAttribute('target', '_blank');
  await expect(
    page.getByRole('link', { name: /Entrar novamente/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Odd', { exact: true })).toHaveValue('3.25');
  expect(writes).toBe(2);
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    await page.screenshot({
      path: testInfo.outputPath(`recuperacao-${theme}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Consulta atualizada');
  expect(writes).toBe(2);
});
test('409 contextual e 413/422 levam a revisão e campo sem apagar entrada', async ({
  page,
}) => {
  let status = 409;
  await page.route('**/api/v1/apostas*', (route) =>
    route.fulfill({
      status,
      json:
        status === 422
          ? {
              detail: [
                {
                  loc: ['body', 'odd'],
                  type: 'float_parsing',
                  msg: 'PRIVATE_MSG',
                  input: 'PRIVATE_INPUT',
                },
              ],
            }
          : { detail: 'PRIVATE_DETAIL' },
    }),
  );
  await page.goto(fixture + '&conflito=estado');
  await page.getByLabel('Odd', { exact: true }).fill('2.10');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Consultar estado atual' }),
  ).toBeVisible();
  for (const code of [413, 422]) {
    status = code;
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(
      page.getByRole('heading', {
        name:
          code === 413
            ? 'O arquivo ultrapassa o limite'
            : 'Confira os dados do pedido',
      }),
    ).toBeVisible();
    await expect(page.getByRole('region')).toBeFocused();
    await expect(page.getByLabel('Odd', { exact: true })).toHaveValue('2.10');
  }
  await expect(page.getByLabel('Odd', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByRole('button', { name: 'Confira Odd' }).click();
  await expect(page.getByLabel('Odd', { exact: true })).toBeFocused();
  await expect(page.getByText(/PRIVATE_/)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('filtro válido recusado por 422 permanece na URL; sintaxe inválida normaliza antes', async ({
  page,
}) => {
  await page.route('**/api/v1/apostas?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('page')).toBe('1');
    expect(params.get('page_size')).toBe('50');
    expect(params.get('estado')).toBe('PENDENTE');
    return route.fulfill({
      status: 422,
      json: {
        detail: [
          { loc: ['query', 'estado'], msg: 'private', type: 'value_error' },
        ],
      },
    });
  });
  await page.goto(fixture + '&page=NaN&page_size=999');
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'não remove um filtro válido',
  );
  expect(new URL(page.url()).searchParams.get('estado')).toBe('PENDENTE');
});
test('429 respeita prazo e 503 termina sem loop de leitura', async ({
  page,
}) => {
  await page.clock.install();
  let status = 429;
  let reads = 0;
  await page.route('**/api/v1/apostas?*', (route) => {
    reads++;
    return route.fulfill({
      status,
      headers: { 'Retry-After': '1' },
      json: { detail: 'synthetic' },
    });
  });
  await page.goto(fixture);
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect.poll(() => reads).toBe(1);
  await page.clock.runFor(1000);
  await expect.poll(() => reads).toBe(2);
  await page.clock.runFor(2500);
  await expect.poll(() => reads).toBe(3);
  await expect(
    page.getByRole('heading', { name: 'Aguarde para tentar novamente' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeDisabled();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeEnabled();
  status = 503;
  reads = 0;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect.poll(() => reads).toBe(1);
  for (const [duration, count] of [
    [1500, 2],
    [2500, 3],
    [4500, 4],
  ]) {
    await page.clock.runFor(duration!);
    await expect.poll(() => reads).toBe(count);
  }
  await expect(
    page.getByRole('heading', {
      name: 'O serviço está temporariamente indisponível',
    }),
  ).toBeVisible();
  await page.clock.runFor(30000);
  expect(reads).toBe(4);
});
for (const outcome of ['rede', 'timeout'] as const) {
  test(`${outcome} após commit preserva entrada e exige conferência sem reenviar`, async ({
    page,
  }) => {
    await page.clock.install();
    let committed = 0;
    let reads = 0;
    await page.route('**/api/v1/apostas*', async (route) => {
      if (route.request().method() === 'POST') {
        committed++;
        if (outcome === 'rede') await route.abort('failed');
      } else {
        reads++;
        await route.fulfill({ json: betsWithUnknownValues });
      }
    });
    await page.goto(fixture);
    await page.getByLabel('Odd', { exact: true }).fill('4.50');
    await expect(page.getByLabel('Odd', { exact: true })).toHaveValue('4.50');
    const send = page.getByRole('button', { name: 'Enviar', exact: true });
    // Exercise native keyboard submission under the test clock, exactly once.
    await send.focus();
    await expect(send).toBeFocused();
    await send.press('Enter');
    await expect.poll(() => committed).toBe(1);
    if (outcome === 'timeout') await page.clock.runFor(15000);
    await expect(
      page.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
    ).toBeVisible();
    await expect(page.getByLabel('Odd', { exact: true })).toHaveValue('4.50');
    await expect(
      page.getByRole('button', { name: 'Enviar', exact: true }),
    ).toBeDisabled();
    expect(reads).toBe(0);
    await page.getByRole('button', { name: 'Conferir resultado' }).click();
    await expect(page.getByRole('status')).toContainText(
      'não prova que a gravação falhou',
    );
    expect(reads).toBe(1);
    await page.clock.runFor(60000);
    expect(committed).toBe(1);
    expect(reads).toBe(1);
  });
}
test('build público não expõe a demonstração de recuperação', async ({
  page,
}) => {
  await page.goto('/testes/recuperacao?estado=401');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Recuperação de um pedido' }),
  ).toHaveCount(0);
});
