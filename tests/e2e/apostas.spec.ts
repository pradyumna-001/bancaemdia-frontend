import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { billingStatus } from '../fixtures/acesso';
import { paginaExemplo, resumoExemplo } from '../fixtures/apostas';

const exercise = 'http://127.0.0.1:4180';
async function api(page: Page, access = 'FULL_WRITE') {
  const session = {
    usuario_id: 1,
    nome: 'Sandbox',
    email: 'sandbox@example.org',
    session_version: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa:1',
    csrf_token: crypto.randomUUID(),
    refresh_required: false,
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
  };
  const requests: string[] = [];
  let list = (route: Route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: paginaExemplo(
        Number(url.searchParams.get('page') ?? 1),
        Number(url.searchParams.get('page_size') ?? 2),
      ),
    });
  };
  let summary = (route: Route) => route.fulfill({ json: resumoExemplo });
  await page.route('**/auth/**', (route) => route.fulfill({ json: session }));
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    if (url.pathname === '/api/v1/billing/status')
      return route.fulfill({ json: { ...billingStatus, access } });
    if (url.pathname === '/api/v1/apostas') return list(route);
    if (url.pathname === '/api/v1/painel/filtrado') return summary(route);
    if (url.pathname.startsWith('/api/v1/filtros/'))
      return route.fulfill({
        json: {
          dimensao: url.pathname.split('/').at(-1),
          data: [
            {
              id: url.searchParams.get('id') ?? '7',
              nome: 'Nome autorizado',
              ativa: false,
            },
          ],
          pagination: {
            page: Number(url.searchParams.get('page') ?? 1),
            page_size: 20,
            total: 1,
          },
        },
      });
    return route.fulfill({
      json: {
        total: 0,
        por_motivo: {},
        mais_antiga_em: null,
        idade_maxima_segundos: 0,
      },
    });
  });
  return {
    requests,
    list: (handler: typeof list) => {
      list = handler;
    },
    summary: (handler: typeof summary) => {
      summary = handler;
    },
  };
}

test('Apostas tem dois temas, contexto legível, teclado, contraste e reflow de 320px', async ({
  page,
}, info) => {
  await api(page);
  await page.goto(exercise + '/?page_size=2&apagadas=todas');
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await expect(page.getByText('R$ 923,45')).toBeVisible();
  const detail = page
    .getByRole('article', { name: 'Flamengo × Palmeiras' })
    .getByText('Informações da aposta');
  await detail.focus();
  await detail.press('Enter');
  await expect(
    page
      .getByRole('article', { name: 'Flamengo × Palmeiras' })
      .getByText('Conta principal (inativa)'),
  ).toBeVisible();
  await expect(page.getByText('Ana (arquivado)')).toBeVisible();
  await expect(page.getByText('9007199254740995')).toBeVisible();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath('apostas-' + theme + '.png'),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator('select,input[type="date"]').count()).toBe(0);
});
test('Mostrar mais mantém filtros/posição e elimina duplicata sem GET de detalhe', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(
    exercise + '/?page_size=2&apagadas=todas&grupo=9007199254740993',
  );
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar mais' }).click();
  await expect(
    page.getByRole('heading', { name: 'Grêmio × Internacional' }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByText('Descrição corrigida')).toBeVisible();
  await expect(page.getByText('Freebet — valor de face')).toBeVisible();
  await expect(page.getByText('Revisão necessária')).toBeVisible();
  await expect(page.getByText('Apagada — fora da apuração')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Mostrar mais' }),
  ).toBeDisabled();
  expect(
    app.requests
      .filter((url) => url.startsWith('/api/v1/apostas?'))
      .every((url) => url.includes('grupo_id=9007199254740993')),
  ).toBe(true);
  expect(app.requests.some((url) => url.startsWith('/api/v1/apostas/'))).toBe(
    false,
  );
  expect(new URL(page.url()).searchParams.get('grupo')).toBe(
    '9007199254740993',
  );
});

test('Lista compacta mostra mais apostas; Cartões preserva dados, páginas, filtros e histórico', async ({
  page,
}, info) => {
  const app = await api(page);
  await page.goto(exercise + '/?page_size=2&apagadas=todas&casa=7');
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar mais' }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  const list = page.locator('.apostas-itens');
  const compactHeight = (await list.boundingBox())!.height;
  const reads = app.requests.length;
  await page.getByRole('button', { name: 'Cartões', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Cartões', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(new URL(page.url()).searchParams.get('casa')).toBe('7');
  const cardsHeight = (await list.boundingBox())!.height;
  expect(compactHeight).toBeLessThan(cardsHeight * 0.65);
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(app.requests).toHaveLength(reads);
  for (const mode of ['lista', 'cartoes']) {
    await page
      .getByRole('button', {
        name: mode === 'lista' ? 'Lista compacta' : 'Cartões',
        exact: true,
      })
      .click();
    for (const theme of ['claro', 'escuro']) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute('data-tema', value),
        theme,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`apostas-${mode}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  await page.goBack();
  await expect(
    page.getByRole('button', { name: 'Lista compacta', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(app.requests).toHaveLength(reads);
  await page.setViewportSize({ width: 320, height: 844 });
  const details = page
    .getByRole('article', { name: 'Flamengo × Palmeiras' })
    .getByText('Informações da aposta');
  await details.click();
  await expect(
    page
      .getByRole('article', { name: 'Flamengo × Palmeiras' })
      .getByText('Conta principal (inativa)'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('Filtros removíveis conservam histórico, resumo equivalente e retorno por teclado', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(exercise + '/?page_size=2&casa=7&apagadas=1');
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await page.getByText('Filtrar apostas — há filtros ativos').click();
  const picker = page.getByRole('button', { name: 'Estado Sem filtro' });
  await picker.focus();
  await picker.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Estado' });
  await dialog.getByRole('button', { name: 'Pendente', exact: true }).click();
  await expect(page).toHaveURL(/estado=PENDENTE/);
  await expect(
    page.getByRole('button', { name: 'Estado Pendente' }),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Remover filtro Visibilidade' })
    .click();
  await expect(page).not.toHaveURL(/apagadas=/);
  await page.goBack();
  await expect(page).toHaveURL(/apagadas=1/);
  await page.reload();
  await page.getByText('Filtrar apostas — há filtros ativos').click();
  await expect(
    page.getByRole('button', { name: 'Remover filtro Casa' }),
  ).toContainText('Nome autorizado');
  await expect
    .poll(() =>
      app.requests.some(
        (url) =>
          url.startsWith('/api/v1/painel/filtrado?') &&
          url.includes('estado=PENDENTE') &&
          url.includes('visibilidade=apagadas'),
      ),
    )
    .toBe(true);
});
test('falha de atualização mantém dados e Retry-After bloqueia gatilhos até repetição manual', async ({
  page,
}) => {
  const app = await api(page);
  await page.goto(exercise + '/?page_size=2');
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Atualizar visão' }),
  ).toBeEnabled();
  await page.clock.install();
  app.list((route) =>
    route.fulfill({
      status: 429,
      headers: { 'Retry-After': '70' },
      json: { detail: 'secret' },
    }),
  );
  await page.getByRole('button', { name: 'Atualizar visão' }).focus();
  await page.getByRole('button', { name: 'Atualizar visão' }).press('Enter');
  await expect(
    page.getByText('As apostas já carregadas foram mantidas.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Atualizar visão' }),
  ).toBeDisabled();
  const reads = app.requests.filter((url) =>
    url.startsWith('/api/v1/apostas?'),
  ).length;
  await page.clock.fastForward(69000);
  expect(
    app.requests.filter((url) => url.startsWith('/api/v1/apostas?')),
  ).toHaveLength(reads);
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeDisabled();
  await page.clock.fastForward(2000);
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toBeEnabled();
  expect(
    app.requests.filter((url) => url.startsWith('/api/v1/apostas?')),
  ).toHaveLength(reads);
  app.list((route) => route.fulfill({ json: paginaExemplo() }));
  await page.getByRole('button', { name: 'Tentar novamente' }).focus();
  await page.getByRole('button', { name: 'Tentar novamente' }).press('Enter');
  await expect(
    page.getByText('As apostas já carregadas foram mantidas.', {
      exact: false,
    }),
  ).toHaveCount(0);
  await expect(page.getByText('secret', { exact: true })).toHaveCount(0);
});
test('resumo indisponível preserva a lista e não toma a soma dos itens como valor financeiro', async ({
  page,
}) => {
  const app = await api(page);
  app.summary((route) => route.fulfill({ status: 404, json: {} }));
  await page.goto(exercise + '/?page_size=2');
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Resumo desta visão' }).getByRole('alert'),
  ).toBeVisible();
  await expect(page.getByText('R$ 923,45')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toHaveCount(0);
});
test('modo de leitura continua consultando a lista e encaminha entrada ao Telegram', async ({
  page,
}) => {
  await api(page, 'READ_ONLY');
  await page.goto(exercise + '/?page_size=2&casa=7');
  await expect(
    page.getByRole('heading', { name: 'Sua conta está em modo de leitura' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Conectar Telegram', exact: true }),
  ).toHaveAttribute('href', '/configuracoes/conexoes?page_size=2&casa=7');
});
test('build público ignora o contrato e a sessão do exercício apontados por URL/storage', async ({
  page,
}) => {
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
  await page.addInitScript(() => {
    localStorage.setItem('session', 'true');
    sessionStorage.setItem('contract', '184');
  });
  await page.goto('/?session=true&contract=184&fixture=http://127.0.0.1:4180');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Flamengo × Palmeiras' }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Demonstração isolada', { exact: false }),
  ).toHaveCount(0);
});
