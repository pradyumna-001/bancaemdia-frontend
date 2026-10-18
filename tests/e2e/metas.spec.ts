import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const demo = process.env.METAS_DEMO_URL ?? 'http://127.0.0.1:4226';
async function choose(page: Page, label: string, value: string) {
  const button = page.getByRole('button', {
    name: new RegExp('^' + label + ' '),
  });
  await expect(button).toBeEnabled();
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: label, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: value, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
}
async function open(page: Page) {
  await page.goto(demo + '/painel/metas?casa=7&apagadas=1');
  await expect(
    page.getByRole('heading', { name: 'Resultado de outubro' }),
  ).toBeVisible();
}
async function fill(page: Page) {
  await expect(
    page.getByRole('button', { name: 'Nova meta', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Nova meta', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('');
  await page.getByLabel('Título', { exact: true }).fill('Objetivo próprio');
  await choose(page, 'Métrica', 'Lucro');
  for (const [label, day] of [
    ['Data inicial da meta', 10],
    ['Data final da meta', 18],
  ] as const) {
    await page
      .getByRole('button', { name: new RegExp('^' + label + ' ') })
      .click();
    await page
      .getByRole('dialog', { name: label, exact: true })
      .locator('button[data-dia]')
      .nth(day)
      .click();
  }
  await page.getByLabel('Alvo', { exact: true }).fill('1000,00');
  await page.getByLabel('Linha base', { exact: true }).fill('0');
}
test('lista legível, duas aparências, teclado e criação/edição/arquivo preservam o histórico', async ({
  page,
}, info) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (
      ['POST', 'PATCH', 'DELETE'].includes(request.method()) &&
      request.url().includes('/painel/metas')
    )
      requests.push(request.method());
  });
  await open(page);
  await expect(page.getByText('133,3333%', { exact: true })).toBeVisible();
  await expect(page.getByText('Não calculável', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Ver Análises' }),
  ).toHaveAttribute('href', '/painel/analises?casa=7&apagadas=1');
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await document.fonts.ready;
    });
    await page.evaluate((value) => {
      document.documentElement.dataset.tema = value;
    }, theme);
    const status = await page
      .getByRole('button', { name: /^Mostrar metas / })
      .boundingBox();
    const consult = await page
      .getByRole('button', { name: 'Consultar metas', exact: true })
      .boundingBox();
    expect(status).not.toBeNull();
    expect(consult).not.toBeNull();
    if (page.viewportSize()!.width > 640) {
      expect(
        Math.abs(status!.y + status!.height - consult!.y - consult!.height),
      ).toBeLessThan(1);
    } else {
      expect(Math.abs(status!.x - consult!.x)).toBeLessThan(1);
      expect(Math.abs(status!.width - consult!.width)).toBeLessThan(1);
      expect(consult!.y).toBeGreaterThanOrEqual(status!.y + status!.height);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath('metas-' + theme + '.png'),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await fill(page);
  await page.getByRole('button', { name: 'Criar meta', exact: true }).click();
  await expect(page.getByText('Meta criada.', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Editar Objetivo próprio', exact: true })
    .click();
  await page.getByLabel('Título', { exact: true }).fill('Objetivo revisado');
  await choose(page, 'Status da meta', 'Concluída');
  await page.getByRole('button', { name: 'Salvar alterações da meta' }).click();
  await expect(
    page.getByText('Meta atualizada.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('article').filter({
      has: page.getByRole('heading', {
        name: 'Objetivo revisado',
        exact: true,
      }),
    }),
  ).toContainText('42%');
  const archive = page.getByRole('button', {
    name: 'Arquivar Objetivo revisado',
    exact: true,
  });
  await archive.click();
  const dialog = page.getByRole('dialog', { name: 'Arquivar esta meta?' });
  await expect(dialog.getByRole('button', { name: 'Agora não' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(archive).toBeFocused();
  await archive.click();
  await dialog
    .getByRole('button', { name: 'Arquivar meta', exact: true })
    .click();
  await expect(
    page.getByText('Meta arquivada.', { exact: false }),
  ).toBeVisible();
  await choose(page, 'Mostrar metas', 'Arquivada');
  await expect(
    page.getByRole('heading', { name: 'Objetivo revisado' }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('casa')).toBe('7');
  expect(new URL(page.url()).searchParams.get('meta_status')).toBe('arquivada');
  expect(requests).toEqual(['POST', 'PATCH', 'DELETE']);
  expect(await page.locator('select,input[type=date]').count()).toBe(0);
});
test('perda após criação exige consulta e fechamento sem reenvio ou falsa reconciliação', async ({
  page,
}) => {
  await open(page);
  await fill(page);
  let sends = 0;
  let lost!: () => void;
  const lostResponse = new Promise<void>((resolve) => {
    lost = resolve;
  });
  await page.route('**/api/v1/painel/metas', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    sends++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('failed');
    lost();
  });
  await page.getByRole('button', { name: 'Criar meta', exact: true }).click();
  await lostResponse;
  await expect(
    page.getByRole('heading', {
      name: 'Não recebemos confirmação deste pedido',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Consultar lista de metas' }),
  ).toBeEnabled();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue(
    'Objetivo próprio',
  );
  await page.getByRole('button', { name: 'Consultar lista de metas' }).click();
  await expect(
    page.getByText(
      'Lista consultada. Ela não confirma o resultado daquela criação.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Objetivo próprio' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Criar meta', exact: true }),
  ).toBeDisabled();
  expect(sends).toBe(1);
  await page
    .getByRole('button', { name: 'Encerrar este acompanhamento' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Fechar este formulário?' });
  await expect(dialog.getByText(/não cancela/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar formulário' }).click();
  await page.getByRole('button', { name: 'Nova meta', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('');
  expect(sends).toBe(1);
});
test('leitura mantém lista/fuso e prazo do serviço bloqueia novo gesto', async ({
  page,
}) => {
  await page.route('**/api/v1/billing/status', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), access: 'READ_ONLY' },
    });
  });
  await open(page);
  await expect(
    page.getByRole('button', { name: 'Nova meta', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Você pode consultar metas/)).toBeVisible();
  await page.getByRole('button', { name: 'Consultar fuso salvo' }).click();
  await expect(page.getByText(/Fuso atual confirmado/)).toBeVisible();
  await page.route('**/api/v1/painel/metas', (route) =>
    route.fulfill({
      status: 429,
      headers: { 'Retry-After': '61' },
      json: { detail: 'rate_limit' },
    }),
  );
  await page
    .getByRole('button', { name: 'Consultar metas', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Consultar metas', exact: true }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('erro/vazio têm saída e formulário preserva dados após recusa', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/api/v1/painel/metas', (route) => {
    if (route.request().method() === 'POST')
      return route.fulfill({
        status: 422,
        json: {
          detail: [
            { loc: ['body', 'titulo'], input: 'Nunca exibir', msg: 'Interno' },
          ],
        },
      });
    if (fail)
      return route.fulfill({
        status: 500,
        json: { detail: 'Diagnóstico interno proibido' },
      });
    return route.fulfill({ status: 200, json: [] });
  });
  await page.goto(demo + '/painel/metas');
  await expect(
    page.getByText('O serviço encontrou um problema.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Diagnóstico interno proibido', { exact: true }),
  ).toHaveCount(0);
  fail = false;
  await page
    .getByRole('button', { name: 'Consultar metas', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Você ainda não criou metas' }),
  ).toBeVisible();
  await fill(page);
  await page.getByRole('button', { name: 'Criar meta', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Confira os dados do pedido',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue(
    'Objetivo próprio',
  );
  await expect(page.getByText('Nunca exibir', { exact: true })).toHaveCount(0);
});
