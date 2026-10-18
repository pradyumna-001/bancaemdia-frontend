import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { billingStatus } from '../fixtures/acesso';
import golden from '../fixtures/calculadoras-golden.json' with { type: 'json' };

const headers = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Retry-After',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
async function api(page: Page) {
  const writes: Array<{ path: string; body: unknown; csrf: boolean }> = [];
  let respond = async (route: Route) =>
    route.fulfill({
      json: golden.cases.find(
        (item) =>
          `/api/v1/calculadoras/${item.tool}` ===
          new URL(route.request().url()).pathname,
      )!.response,
      headers,
    });
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
    if (path.startsWith('/api/v1/calculadoras/') && req.method() === 'POST') {
      writes.push({
        path,
        body: req.postDataJSON(),
        csrf: !!req.headers()['x-csrf-token'],
      });
      return respond(route);
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
    reply: (handler: typeof respond) => {
      respond = handler;
    },
  };
}
async function fillMarket(page: Page, odd = '2') {
  await page.getByLabel('Nome do resultado 1').fill('Casa vence');
  await page.getByLabel('Nome do resultado 2').fill('Visitante vence');
  await page.getByLabel('Odd do resultado 1').fill(odd);
  await page.getByLabel('Odd do resultado 2').fill(odd);
  await page.getByRole('checkbox').check();
}
const resultTitle = (page: Page) =>
  page.getByRole('heading', { name: 'Resultado informado pelo serviço' });

test('Calculadoras legíveis nos temas, formulário acessível e ferramenta na URL', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', () => errors.push('pageerror'));
  const app = await api(page);
  await page.goto('/calculadoras?casa=7&apagadas=1&ferramenta=invalid');
  await expect(
    page.getByRole('heading', { name: 'Mercado justo', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Mercado justo', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    await expect(page.locator('select,input[type=date]')).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await info.attach(`calculadoras-formulario-${theme}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
  await page
    .getByRole('link', { name: 'Percentual da banca', exact: true })
    .click();
  await expect(page).toHaveURL(/casa=7&apagadas=1&ferramenta=percentual-banca/);
  await expect(page.getByLabel('Banca informada (R$)')).toHaveValue('');
  await page.getByLabel('Banca informada (R$)').fill('100,00');
  await page.getByLabel('Percentual (%)').fill('1,25');
  await page.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect(resultTitle(page)).toBeFocused();
  await page.getByText('Premissas e método do serviço').click();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await resultTitle(page).focus();
    await info.attach(`calculadoras-resposta-${theme}`, {
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
  await expect(
    page.getByRole('link', { name: 'Voltar para Apostas' }),
  ).toHaveAttribute(
    'href',
    '/apostas?casa=7&apagadas=1&ferramenta=percentual-banca',
  );
  expect(app.writes).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const entry of [
  golden.cases[0]!,
  golden.cases[3]!,
  golden.cases[6]!,
  golden.cases[9]!,
]) {
  test(`Caso golden ${entry.name}: body exato e resultados do serviço em leitura`, async ({
    page,
  }) => {
    const app = await api(page);
    app.reply((route) => route.fulfill({ json: entry.response, headers }));
    await page.goto(`/calculadoras?casa=7&ferramenta=${entry.tool}`);
    if (entry.tool === 'mercado-justo') await fillMarket(page);
    else if (entry.tool === 'distribuir-entre-resultados') {
      await fillMarket(page, '1,9');
      await page.getByLabel('Entrada total (R$)').fill('100,00');
    } else if (entry.tool === 'cobertura-ao-vivo') {
      await page.getByLabel('Entrada original (R$)').fill('100,00');
      await page.getByLabel('Odd original').fill('1,5');
      await page.getByLabel('Odd oposta').fill('2');
      await page.getByLabel('Comissão (%)').fill('10');
    } else {
      await page.getByLabel('Banca informada (R$)').fill('1,01');
      await page
        .getByRole('radio', { name: 'Percentual a partir do valor' })
        .check();
      await page.getByLabel('Valor da entrada (R$)').fill('0,01');
    }
    await page.getByRole('button', { name: 'Consultar resultado' }).click();
    await expect(resultTitle(page)).toBeVisible();
    expect(app.writes).toEqual([
      {
        path: `/api/v1/calculadoras/${entry.tool}`,
        body: entry.body,
        csrf: true,
      },
    ]);
    if (entry.tool === 'mercado-justo')
      await expect(page.getByRole('cell', { name: '50,000000%' })).toHaveCount(
        4,
      );
    if (entry.tool === 'distribuir-entre-resultados') {
      await expect(page.getByText('−R$ 5,00')).toHaveCount(3);
      await expect(
        page.getByText(
          'Pelo menos um cenário após o arredondamento não apresenta lucro.',
        ),
      ).toBeVisible();
    }
    if (entry.tool === 'cobertura-ao-vivo')
      await expect(page.getByRole('cell', { name: '−R$ 31,32' })).toBeVisible();
    if (entry.tool === 'percentual-banca')
      await expect(page.getByText('0,990099%')).toHaveCount(2);
    if (entry.tool !== 'percentual-banca') {
      const table = page.getByRole('region', {
        name: 'Cenários calculados; tabela com rolagem horizontal',
      });
      await table.focus();
      await expect(table).toBeFocused();
      await page.keyboard.press('ArrowRight');
    }
    await expect(
      page.getByText('Sua conta está em modo de leitura'),
    ).toBeVisible();
  });
}
test('Mudança de entrada descarta consulta tardia, sem replay; parada e revisão preservam campos', async ({
  page,
}) => {
  const app = await api(page);
  let release!: () => void;
  app.reply(async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: golden.cases[0]!.response, headers });
  });
  await page.goto('/calculadoras');
  await fillMarket(page);
  await page.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect.poll(() => app.writes.length).toBe(1);
  await page.getByLabel('Odd do resultado 1').fill('3');
  release();
  await expect(resultTitle(page)).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Consultar resultado' }),
  ).toBeEnabled();
  expect(app.writes).toHaveLength(1);
  app.reply((route) =>
    route.fulfill({ json: golden.cases[0]!.response, headers }),
  );
  await page.getByLabel('Odd do resultado 1').fill('2');
  await page.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect(resultTitle(page)).toBeVisible();
  expect(app.writes).toHaveLength(2);
  await page.getByLabel('Nome do resultado 1').fill('Novo nome');
  await expect(resultTitle(page)).toHaveCount(0);
  await expect(page.getByLabel('Nome do resultado 1')).toHaveValue('Novo nome');
});
test('422 seguro e 429 preservam entrada e prazo entre ferramentas, sem tentativa automática', async ({
  page,
}) => {
  const app = await api(page);
  app.reply((route) =>
    route.fulfill({
      status: 422,
      json: {
        detail: [
          {
            loc: ['body', 'bankroll_centavos'],
            type: 'value_error',
            msg: 'secret details',
            input: 'private',
          },
        ],
      },
      headers,
    }),
  );
  await page.goto('/calculadoras?ferramenta=percentual-banca');
  await page.getByLabel('Banca informada (R$)').fill('100,00');
  await page.getByLabel('Percentual (%)').fill('1,25');
  await page.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('secret details')).toHaveCount(0);
  await page.getByRole('button', { name: 'Confira banca informada' }).click();
  await expect(page.getByLabel('Banca informada (R$)')).toBeFocused();
  await expect(page.getByLabel('Banca informada (R$)')).toHaveValue('100,00');
  app.reply((route) =>
    route.fulfill({
      status: 429,
      json: { detail: 'rate_limited' },
      headers: { ...headers, 'Retry-After': '61' },
    }),
  );
  await page.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect(
    page.getByRole('button', { name: 'Consultar resultado' }),
  ).toBeDisabled();
  await page.getByLabel('Percentual (%)').fill('2');
  await page
    .getByRole('link', { name: 'Cobertura ao vivo', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Consultar resultado' }),
  ).toBeDisabled();
  expect(app.writes).toHaveLength(2);
});
test('Build público não contém bypass da prévia nem ferramenta de linhas', async ({
  page,
}) => {
  await api(page);
  await page.goto('/testes/calculadoras?session=true');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await page.goto('/calculadoras?ferramenta=linhas');
  await expect(
    page.getByRole('link', { name: 'Mercado justo', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page
      .getByRole('navigation', { name: 'Escolha a ferramenta' })
      .getByRole('link'),
  ).toHaveCount(4);
});
