import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { billingStatus } from '../fixtures/acesso';
import examples from '../fixtures/hipotetica.json' with { type: 'json' };

const headers = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Retry-After',
};
async function api(page: Page, initial: unknown = examples.comparado) {
  let body = initial;
  let status = 200;
  let retry = '';
  const calls: URL[] = [];
  const writes: string[] = [];
  await page.route('http://127.0.0.1:8000/**', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (!['GET', 'OPTIONS'].includes(req.method())) writes.push(req.method());
    if (url.pathname === '/auth/session')
      return route.fulfill({
        headers,
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
      });
    if (url.pathname === '/api/v1/billing/status')
      return route.fulfill({
        headers,
        json: { ...billingStatus, access: 'READ_ONLY' },
      });
    if (url.pathname.startsWith('/api/v1/filtros/'))
      return route.fulfill({
        headers,
        json: {
          dimensao: url.pathname.split('/').at(-1),
          data: [{ id: '7', nome: 'Exemplo', ativa: true }],
          pagination: { page: 1, page_size: 20, total: 1 },
        },
      });
    if (url.pathname === '/api/v1/painel/hipotetica') {
      calls.push(url);
      return route.fulfill({
        headers: { ...headers, ...(retry ? { 'Retry-After': retry } : {}) },
        status,
        json: body,
      });
    }
    return route.fulfill({
      headers,
      json: {
        total: 0,
        por_motivo: {},
        mais_antiga_em: null,
        idade_maxima_segundos: 0,
      },
    });
  });
  return {
    calls,
    writes,
    respond: (value: unknown, code = 200, retryAfter = '') => {
      body = value;
      status = code;
      retry = retryAfter;
    },
  };
}

test('Hipotética tem comparação real, leitura comercial, contraste, temas, teclado e reflow', async ({
  page,
}, info) => {
  const app = await api(page);
  await page.goto('/e-se');
  await expect(
    page.getByRole('heading', { name: 'Comparação disponível' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'O que aconteceu' }),
  ).toContainText('+R$ 160,00');
  await expect(
    page.getByRole('region', { name: 'Seguindo a stake do tipster' }),
  ).toContainText('+R$ 20,00');
  await expect(
    page.getByRole('region', { name: 'O que mudaria' }),
  ).toContainText('−R$ 140,00');
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`hipotetica-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByText('Filtrar comparação', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Filtros', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Visibilidade/ }).click();
  await expect(
    page.getByRole('dialog', { name: /Visibilidade/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator('select, input[type=date]').count()).toBe(0);
  expect(app.writes).toEqual([]);
});
test('link secundário em Apostas preserva filtros e identifica área ativa', async ({
  page,
}, info) => {
  const data = {
    ...examples.comparado,
    filtros: {
      ...examples.comparado.filtros,
      casa_id: '7',
      visibilidade: 'apagadas',
    },
  };
  await api(page, data);
  await page.goto('/?casa=7&apagadas=1');
  const link = page.getByRole('link', {
    name: 'E se eu seguisse a stake do tipster?',
  });
  await expect(link).toHaveAttribute('href', '/e-se?casa=7&apagadas=1');
  await link.click();
  await expect(
    page.getByRole('heading', { name: 'Comparação disponível' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '← Voltar às Apostas' }),
  ).toHaveAttribute('href', '/?casa=7&apagadas=1');
  const nav = page.getByRole('navigation', {
    name: info.project.name.endsWith('mobile')
      ? 'Navegação principal no celular'
      : 'Navegação principal',
    exact: true,
  });
  await expect(
    nav.getByRole('link', { name: 'Apostas', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByText(/somente apostas apagadas/)).toBeVisible();
});
test('dados incompletos continuam desconhecidos; estado vazio oferece ação', async ({
  page,
}) => {
  const app = await api(page, examples.indisponivel);
  await page.goto('/e-se');
  await expect(
    page.getByRole('heading', {
      name: 'Não há dados suficientes para comparar',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Seguindo a stake do tipster' }),
  ).toContainText('Não informado');
  await expect(
    page.getByRole('heading', { name: 'Limitações deste recorte' }),
  ).toBeVisible();
  app.respond(examples.vazio);
  await page.getByRole('button', { name: 'Atualizar comparação' }).click();
  await expect(
    page.getByRole('heading', { name: 'Nenhuma aposta neste recorte' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Ver Apostas', exact: true }),
  ).toBeVisible();
});
test('filtros inválidos usam padrão; conflito não envia comparação e não remove critérios válidos', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto('/e-se?casa=texto');
  await expect(
    page.getByRole('heading', { name: 'Comparação disponível' }),
  ).toBeVisible();
  expect(app.calls[0]!.searchParams.has('casa_id')).toBe(false);
  await page.goto('/e-se?periodo=7d&desde=2026-10-01');
  await expect(page.getByRole('alert').first()).toContainText(
    'Escolha um período ou datas',
  );
  expect(app.calls).toHaveLength(1);
  expect(page.url()).toContain('periodo=7d&desde=2026-10-01');
});
test('429 respeita Retry-After entre recortes; 404 não oferece replay nem revela erro bruto', async ({
  page,
}) => {
  const app = await api(page);
  app.respond({ detail: 'diagnóstico privado' }, 429, '120');
  await page.goto('/e-se');
  await expect(
    page.getByRole('heading', { name: 'Aguarde para tentar novamente' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Atualizar comparação' }),
  ).toBeDisabled();
  await page.evaluate(() => history.pushState(null, '', '/e-se?tipster=7'));
  await page.getByRole('link', { name: '← Voltar às Apostas' }).click();
  app.respond({}, 404);
  await page.goto('/e-se?tipster=7');
  await expect(
    page.getByRole('heading', { name: 'Este recurso não está disponível' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Atualizar comparação' }),
  ).toHaveCount(0);
  await expect(page.getByText('diagnóstico privado')).toHaveCount(0);
  expect(page.url()).toContain('tipster=7');
});
test('build público não recebe sessão da demonstração', async ({ page }) => {
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { VITE_API_URL: 'http://127.0.0.1:4200' } }),
  );
  await page.goto('/e-se?casa=7');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
});
