import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('todas as páginas públicas abrem diretamente e após recarregar', async ({
  page,
}) => {
  for (const [path, title] of [
    ['/tutorial', 'Tutorial'],
    ['/extensao', 'Extensão'],
    ['/login', 'Entrar'],
    ['/criar-conta', 'Criar conta'],
    ['/esqueci-senha', 'Esqueci minha senha'],
    ['/redefinir-senha', 'Redefinir senha'],
    ['/confirmar-email', 'Confirmar e-mail'],
  ]) {
    await page.goto(path!);
    await expect(
      page.getByRole('heading', { name: title!, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: title!, exact: true }),
    ).toBeVisible();
  }
});

test('todas as rotas protegidas exigem sessão e preservam destino permitido', async ({
  page,
}) => {
  for (const path of [
    '/',
    '/painel',
    '/enviar',
    '/coleta',
    '/banca',
    '/resultados',
    '/revisao',
    '/aposta/abc-123',
    '/configuracoes',
    '/configuracoes/conexoes',
    '/configuracoes/privacidade',
    '/contas',
    '/contas/42',
    '/assinatura',
    '/calculadoras',
    '/painel/analises',
    '/painel/metas',
    '/sistema',
    '/senha',
    '/sair',
  ]) {
    const destination = `${path}?apagadas=1&casa=Bet%20365#secao`;
    await page.goto(destination);
    await expect(
      page.getByRole('heading', { name: 'Entrar', exact: true }),
    ).toBeVisible();
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('destino')).toBe(
      ['/senha', '/sair'].includes(path) ? '/' : destination,
    );
  }
});

test('404 tem ação acessível e navegação interna funciona sem recarregar', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/rota-inexistente');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('404.png'),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'preservado';
  });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Abrir tutorial' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Tutorial' })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.navigationMarker,
    ),
  ).toBe('preservado');
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Voltar para Apostas' }).click();
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('login.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('um destino externo nunca sai da origem', async ({ page }) => {
  for (const destination of [
    'https://fora.example',
    '//fora.example',
    '/%5cfora.example',
    '/login?destino=/login',
  ]) {
    await page.goto(`/login?${new URLSearchParams({ destino: destination })}`);
    await expect(
      page.getByRole('heading', { name: 'Entrar', exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).origin).toBe('http://127.0.0.1:4173');
    await page.getByRole('link', { name: 'Abrir tutorial' }).click();
    await expect(page.getByRole('heading', { name: 'Tutorial' })).toBeVisible();
  }
});
