import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type BrowserContext,
  type Route,
} from '@playwright/test';

function session(
  id = 1,
  family = crypto.randomUUID(),
  generation = 1,
  required = false,
) {
  return {
    usuario_id: id,
    nome: 'Teste descartável',
    email: 'sandbox@example.org',
    session_version: `${family}:${generation}`,
    csrf_token: crypto.randomUUID(),
    access_expires_at: '2030-01-01T00:00:00Z',
    session_expires_at: '2030-01-02T00:00:00Z',
    refresh_required: required,
  };
}
const cors = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'X-CSRF-Token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
async function mockApi(
  context: BrowserContext,
  handler: (route: Route) => Promise<void>,
) {
  await context.route('http://127.0.0.1:8000/**', async (route) => {
    if (route.request().method() === 'OPTIONS')
      await route.fulfill({ status: 204, headers: cors });
    else await handler(route);
  });
}
const respond = (route: Route, json: unknown, status = 200) =>
  route.fulfill({ status, json, headers: cors });
const stats = (total = 0) => ({
  total,
  por_motivo: total ? { sandbox: total } : {},
  mais_antiga_em: null,
  idade_maxima_segundos: 0,
});

test('páginas públicas não consultam identidade; login inicia a conferência necessária', async ({
  page,
  context,
}) => {
  let reads = 0;
  await mockApi(context, async (route) => {
    if (new URL(route.request().url()).pathname === '/auth/session') reads++;
    await respond(route, { code: 'not_authenticated' }, 401);
  });
  for (const path of [
    '/tutorial',
    '/extensao',
    '/criar-conta',
    '/redefinir-senha',
  ]) {
    await page.goto(path);
    await expect(
      page.getByText('Esta página está em preparação.'),
    ).toBeVisible();
    await page.bringToFront();
    await page.reload();
    await expect(
      page.getByText('Esta página está em preparação.'),
    ).toBeVisible();
  }
  expect(reads).toBe(0);
  await page.goto('/login');
  await expect(
    page.getByRole('button', { name: 'Entrar com minha conta' }),
  ).toBeEnabled();
  expect(reads).toBe(1);
});

test('sem sessão, URL/storage não liberam rota e login hospedado recebe destino sem hash', async ({
  page,
  context,
}) => {
  let destination: string | null = null;
  await mockApi(context, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/start') {
      destination = url.searchParams.get('return_to');
      await route.fulfill({ body: 'Entrada hospedada de teste' });
    } else
      await respond(
        route,
        { code: 'not_authenticated', detail: 'PRIVATE' },
        401,
      );
  });
  await page.goto('/painel?session=true&apagadas=1#serie');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0);
  await page.getByRole('button', { name: 'Entrar com minha conta' }).click();
  await expect.poll(() => destination).toBe('/painel?session=true&apagadas=1');
});
test('guard usa sessão consultada, não concede escrita comercial e mantém shell acessível', async ({
  page,
  context,
}) => {
  const current = session();
  await mockApi(context, (route) =>
    new URL(route.request().url()).pathname === '/auth/session'
      ? respond(route, current)
      : respond(route, { code: 'account_read_only' }, 402),
  );
  await page.goto('/painel?apagadas=1#serie');
  await expect(
    page.getByRole('heading', { name: 'Painel', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível atualizar a fila',
  );
  expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage).length)).toBe(0);
});
test('abas concorrentes consultam dentro da trava antes de decidir um único refresh', async ({
  page,
  context,
}) => {
  const family = crypto.randomUUID();
  let current = session(1, family, 1, true);
  let grants = 0;
  await mockApi(context, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/session') await respond(route, current);
    else if (path === '/auth/refresh') {
      expect(route.request().headers()['x-csrf-token']).toBe(
        current.csrf_token,
      );
      grants++;
      current = session(1, family, 2);
      await respond(route, current);
    } else await respond(route, stats());
  });
  const other = await context.newPage();
  await Promise.all([
    page.goto('/painel'),
    other.goto('http://127.0.0.1:4173/painel'),
  ]);
  for (const tab of [page, other])
    await expect(
      tab.getByRole('heading', { name: 'Painel', exact: true }),
    ).toBeVisible();
  expect(grants).toBe(1);
});
test('troca de usuário em outra aba remove a fila privada que já estava no cache', async ({
  page,
  context,
}) => {
  let current = session();
  await mockApi(context, (route) =>
    new URL(route.request().url()).pathname === '/auth/session'
      ? respond(route, current)
      : respond(route, stats(current.usuario_id === 1 ? 1 : 0)),
  );
  await page.goto('/painel');
  await expect(
    page.getByRole('link', { name: /Revisão.*1 pendências/ }).first(),
  ).toBeVisible();
  current = session(2);
  const other = await context.newPage();
  await other.goto('http://127.0.0.1:4173/painel');
  await expect(
    other.getByRole('heading', { name: 'Painel', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Revisão.*1 pendências/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Painel', exact: true }),
  ).toBeVisible();
});
test('saída incerta limpa conteúdo e oferece reconciliação sem repetir gravação automaticamente', async ({
  page,
  context,
}) => {
  const current = session();
  let missing = false;
  let posts = 0;
  await mockApi(context, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/session')
      await respond(
        route,
        missing ? { code: 'not_authenticated' } : current,
        missing ? 401 : 200,
      );
    else if (path === '/auth/logout') {
      posts++;
      await respond(route, {}, 503);
    } else await respond(route, stats(1));
  });
  await page.goto('/sair');
  await page.getByRole('button', { name: 'Confirmar saída' }).click();
  await expect(
    page.getByRole('heading', { name: 'A saída ainda não foi confirmada' }),
  ).toBeVisible();
  expect(posts).toBe(1);
  await expect(
    page.getByRole('link', { name: /Revisão.*1 pendências/ }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  missing = true;
  await page.getByRole('button', { name: 'Conferir saída' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  expect(posts).toBe(1);
});
