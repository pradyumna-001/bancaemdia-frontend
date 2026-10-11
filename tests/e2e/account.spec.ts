import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext } from '@playwright/test';

async function anonymous(context: BrowserContext) {
  await context.route('http://127.0.0.1:8000/**', async (route) => {
    await route.fulfill({
      status: 401,
      json: { code: 'not_authenticated' },
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  });
}
test('conta pública: opções mantêm o retorno, sem senha local e sem ativar assinatura', async ({
  page,
  context,
}) => {
  await anonymous(context);
  const destination = '/painel?apagadas=1&casa=Bet%20365#serie';
  await page.goto(`/login?${new URLSearchParams({ destino: destination })}`);
  await expect(
    page.getByRole('button', { name: 'Entrar com minha conta' }),
  ).toBeEnabled();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Criar conta', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('destino')).toBe(destination);
  await expect(
    page.locator('input[type="password"],input[type="email"]'),
  ).toHaveCount(0);
  await page.getByText('Não conseguiu continuar?').click();
  await expect(
    page.getByText(/Criar uma conta não ativa uma assinatura/),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Voltar para entrar' }).click();
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(
    page.getByRole('heading', { name: 'Esqueci minha senha', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('destino')).toBe(destination);
  await page.getByText('Não conseguiu continuar?').click();
  await expect(
    page.getByText(/Se houver uma conta para o e-mail informado/),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('URLs de retorno removem protocolo antes da tela sem perder filtros ou liberar sessão', async ({
  page,
  context,
}) => {
  await anonymous(context);
  await page.goto(
    '/login?code=discard&state=discard&error_description=discard&destino=%2Fpainel%3Fapagadas%3D1%26token%3Ddiscard%23serie#access_token=discard',
  );
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  const url = new URL(page.url());
  expect([...url.searchParams.keys()]).toEqual(['destino']);
  expect(url.searchParams.get('destino')).toBe('/painel?apagadas=1#serie');
  expect(url.hash).toBe('');
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await expect(page.getByText('discard')).toHaveCount(0);
  await page.goto('/painel?code=discard&apagadas=1#id_token=discard');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('destino')).toBe(
    '/painel?apagadas=1',
  );
});
test('cadastro/confirmação/recuperação usam somente os intents suportados, sem fragmento na API', async ({
  page,
  context,
}) => {
  await anonymous(context);
  let entry: URL | undefined;
  await context.route('http://127.0.0.1:8000/auth/start?**', async (route) => {
    entry = new URL(route.request().url());
    await route.fulfill({
      body: 'Navegação de contrato, sem identidade simulada',
    });
  });
  for (const [path, intent] of [
    ['/criar-conta', 'signup'],
    ['/esqueci-senha', 'recover'],
    ['/redefinir-senha', 'recover'],
    ['/confirmar-email', 'login'],
  ]) {
    await page.goto(`${path}?destino=%2Fpainel%3Fapagadas%3D1%23serie`);
    const action = page.locator('.conta-acoes button');
    await expect(action).toBeEnabled();
    entry = undefined;
    await action.click();
    await expect.poll(() => entry?.searchParams.get('intent')).toBe(intent);
    expect(entry!.searchParams.get('return_to')).toBe('/painel?apagadas=1');
    expect(entry!.hash).toBe('');
  }
});
test('link expirado ou repetido e recuperação interrompida oferecem recomeço acessível', async ({
  page,
  context,
}) => {
  await anonymous(context);
  await page.goto('/redefinir-senha?token=discard');
  await expect(
    page.getByRole('button', { name: 'Recomeçar recuperação' }),
  ).toBeEnabled();
  await page.getByText('Não conseguiu continuar?').click();
  await expect(
    page.getByText(/link expirou ou já foi utilizado/),
  ).toBeVisible();
  await expect(page.getByText(/interrompeu a recuperação/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('/confirmar-email?key=discard');
  await page.getByText('Não conseguiu continuar?').click();
  await expect(
    page.getByRole('link', { name: 'Recomeçar cadastro' }),
  ).toBeVisible();
  await expect(page.getByText(/opção de reenvio/)).toBeVisible();
  await page.getByRole('link', { name: 'Recomeçar cadastro' }).click();
  await expect(
    page.getByRole('heading', { name: 'Criar conta', exact: true }),
  ).toBeVisible();
});
test('conta respeita 429/Retry-After e retoma por tentativa explícita', async ({
  page,
  context,
}) => {
  let reads = 0;
  let blocked = true;
  await context.route('http://127.0.0.1:8000/auth/session', async (route) => {
    reads++;
    await route.fulfill({
      status: blocked ? 429 : 401,
      json: { code: 'not_authenticated' },
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Retry-After',
        'Retry-After': '1',
      },
    });
  });
  await page.goto('/esqueci-senha');
  const retry = page.getByRole('button', { name: 'Tentar novamente' });
  await expect(retry).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Continuar para recuperar senha' }),
  ).toBeDisabled();
  await expect(retry).toBeEnabled();
  expect(reads).toBe(1);
  blocked = false;
  await retry.click();
  await expect(
    page.getByRole('button', { name: 'Continuar para recuperar senha' }),
  ).toBeEnabled();
  expect(reads).toBe(2);
});
test('telas de conta são operáveis nos dois temas, com teclado e reflow 320px', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60000);
  await anonymous(context);
  for (const path of [
    '/login',
    '/criar-conta',
    '/esqueci-senha',
    '/confirmar-email',
    '/redefinir-senha',
  ]) {
    await page.goto(path);
    await expect(page.locator('.conta-acoes button')).toBeEnabled();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Próximo passo' }),
    ).toHaveCount(0);
    for (const theme of ['claro', 'escuro']) {
      await page.emulateMedia({
        colorScheme: theme === 'claro' ? 'light' : 'dark',
      });
      await expect(page.locator('html')).toHaveAttribute('data-tema', theme);
      const panel = await page.locator('.conta-painel').boundingBox();
      expect(panel).not.toBeNull();
      expect(
        Math.abs(panel!.x + panel!.width / 2 - page.viewportSize()!.width / 2),
      ).toBeLessThan(2);
      expect(panel!.width).toBeLessThanOrEqual(448);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`conta-${path.slice(1)}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  await page.goto('/login');
  await expect(page.locator('.conta-acoes button')).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Entrar com minha conta' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Criar conta', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Criar conta', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator('.conta-acoes button')).toBeVisible();
});
