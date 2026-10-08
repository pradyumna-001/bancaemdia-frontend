import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = 'http://127.0.0.1:4177/testes/filtros-autenticados';
test('catálogos autenticados: nomes históricos, busca/página, URL e recuperação preservam a seleção', async ({
  page,
}, testInfo) => {
  const requests: URL[] = [];
  let unavailable = false;
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { VITE_API_URL: 'http://127.0.0.1:4177' } }),
  );
  await page.route('**/auth/session', (route) =>
    route.fulfill({
      json: {
        usuario_id: 1,
        nome: 'Teste',
        email: 'test@example.org',
        csrf_token: 'fixture-csrf-proof-for-browser',
        session_version: '00000000-0000-0000-0000-000000000001:1',
        refresh_required: false,
        access_expires_at: '2030-01-01T00:00:00Z',
        session_expires_at: '2030-01-02T00:00:00Z',
      },
    }),
  );
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    expect(route.request().headers()['authorization']).toBeUndefined();
    if (url.pathname.includes('/filtros/')) {
      const dimensao = url.pathname.split('/').at(-1)!;
      if (unavailable && dimensao === 'casas')
        return route.fulfill({
          status: 503,
          headers: { 'Retry-After': '61' },
          json: { detail: 'INTERNAL PRIVATE' },
        });
      const id = url.searchParams.get('id');
      const current = Number(url.searchParams.get('page') ?? 1);
      return route.fulfill({
        json: {
          dimensao,
          data:
            dimensao === 'casas'
              ? [
                  {
                    id: id ?? String(current),
                    nome: id ? 'Casa histórica' : 'Casa página ' + current,
                    ativa: !id,
                  },
                ]
              : [],
          pagination: {
            page: current,
            page_size: 50,
            total: dimensao === 'casas' ? 101 : 0,
          },
        },
      });
    }
    return route.fulfill({
      json: { data: [], pagination: { page: 1, page_size: 50, total: 0 } },
    });
  });
  await page.goto(fixture + '?casa=9007199254740993&apagadas=1&extra=keep');
  await expect(
    page.getByRole('button', { name: 'Casa Casa histórica (inativa)' }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        new Set(
          requests
            .filter((url) => url.pathname.includes('/filtros/'))
            .map((url) => url.pathname),
        ).size,
    )
    .toBe(9);
  for (const path of ['/api/v1/apostas', '/api/v1/painel/filtrado']) {
    await expect
      .poll(() =>
        requests
          .find((url) => url.pathname === path)
          ?.searchParams.get('casa_id'),
      )
      .toBe('9007199254740993');
    expect(
      requests
        .find((url) => url.pathname === path)
        ?.searchParams.get('visibilidade'),
    ).toBe('apagadas');
  }
  await page
    .getByRole('button', { name: 'Casa Casa histórica (inativa)' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Casa', exact: true });
  await dialog.getByRole('button', { name: 'Próximas opções' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Casa página 2' }),
  ).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Buscar casa' }).fill('%_São');
  await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.searchParams.get('q') === '%_São' &&
          url.searchParams.get('page') === '1',
      ),
    )
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Casa Casa histórica (inativa)' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Remover filtro Casa' }).click();
  expect(new URL(page.url()).searchParams.get('extra')).toBe('keep');
  await page.goBack();
  await expect(
    page.getByRole('button', { name: 'Casa Casa histórica (inativa)' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Casa Casa histórica (inativa)' }),
  ).toBeVisible();
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('catalogos-' + theme + '.png'),
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
  unavailable = true;
  await page.reload();
  await expect(
    page
      .locator('.legenda')
      .filter({ hasText: /O serviço está temporariamente indisponível/ })
      .first(),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('casa')).toBe('9007199254740993');
  await expect(
    page.getByRole('button', { name: 'Tentar carregar casa' }),
  ).toHaveCount(0);
  await expect(page.getByText('INTERNAL PRIVATE')).toHaveCount(0);
});
test('período mais datas bloqueia os GETs de dados até remoção explícita; build público não contém exercício', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { VITE_API_URL: 'http://127.0.0.1:4177' } }),
  );
  await page.route('**/auth/session', (route) =>
    route.fulfill({
      json: {
        usuario_id: 1,
        nome: 'Teste',
        email: 'test@example.org',
        csrf_token: 'fixture-csrf-proof-for-browser',
        session_version: '00000000-0000-0000-0000-000000000001:1',
        refresh_required: false,
        access_expires_at: '2030-01-01T00:00:00Z',
        session_expires_at: '2030-01-02T00:00:00Z',
      },
    }),
  );
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.includes('/filtros/')) calls++;
    return route.fulfill({
      json: {
        dimensao: url.pathname.split('/').at(-1),
        data: [],
        pagination: { page: 1, page_size: 50, total: 0 },
      },
    });
  });
  await page.goto(fixture + '?periodo=7d&desde=2026-10-06&ate=2026-10-06');
  await expect(page.getByRole('alert')).toContainText(
    'Escolha um período ou datas',
  );
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Remover filtro Período' }).click();
  await expect.poll(() => calls).toBe(2);
  await expect(page.getByLabel('Consulta normalizada')).toContainText(
    '2026-10-07T03:00:00.000Z',
  );
  await page.goto('/testes/filtros-autenticados');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Exercício de filtros autenticados' }),
  ).toHaveCount(0);
});
