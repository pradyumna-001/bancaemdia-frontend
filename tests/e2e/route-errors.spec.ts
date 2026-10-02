import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const fixture = 'http://127.0.0.1:4175';
const suffix = '?apagadas=1&estado=GREEN&casa=Bet%20365#serie';
const titles = {
  404: 'Este recurso não está disponível',
  405: 'Esta ação não está disponível',
  500: 'Não foi possível abrir esta página',
} as const;

test('404 público retorna à área correta com filtros/seção, sem iniciar identidade', async ({
  page,
}, testInfo) => {
  let identity = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/auth/')) identity++;
  });
  for (const [path, target, label] of [
    ['/endereco-antigo', '/', 'Apostas'],
    ['/painel/endereco-antigo', '/painel', 'Painel'],
    ['/contas/endereco/antigo', '/contas', 'Contas e titulares'],
    ['/coleta/endereco-antigo', '/coleta', 'Coleta'],
  ]) {
    await page.goto(`${path}${suffix}`);
    await expect(
      page.getByRole('heading', { name: 'Não achei esta página' }),
    ).toBeFocused();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(
      page.getByRole('link', { name: `Voltar para ${label}` }),
    ).toHaveAttribute('href', `${target}${suffix}`);
  }
  expect(identity).toBe(0);
  for (const theme of ['Claro', 'Escuro']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`erro-endereco-${theme}.png`),
      fullPage: true,
    });
  }
  if (testInfo.project.name.endsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('erro-endereco-320.png'),
      fullPage: true,
    });
  }
  await page.getByRole('link', { name: 'Voltar para Coleta' }).focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Abrir tutorial' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Tutorial', exact: true }),
  ).toBeVisible();
});

test('404/405/500 nas áreas antigas e novas mantêm navegação sem revelar corpo privado', async ({
  page,
}) => {
  test.setTimeout(90_000);
  let status = 404;
  await page.route(fixture + '/testes/rota?*', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: '{"trace":"TRACE_PRIVADA","email":"OUTRA_CONTA"}',
    }),
  );
  for (const path of [
    '/aposta/ausente',
    '/painel/analises',
    '/contas/42',
    '/coleta',
    '/banca',
    '/calculadoras',
    '/assinatura',
    '/configuracoes/privacidade',
    '/enviar',
    '/resultados',
    '/revisao',
    '/senha',
  ]) {
    for (const value of [404, 405, 500] as const) {
      status = value;
      await page.goto(`${fixture}${path}${suffix}`);
      await page.reload();
      await expect(
        page.getByRole('heading', { name: titles[value] }),
      ).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(1);
      await expect(
        page.getByRole('link', { name: 'bancaemdia — Apostas' }),
      ).toBeVisible();
      await expect(page.locator('main')).not.toContainText(
        /TRACE_PRIVADA|OUTRA_CONTA|stack|Erro \d/,
      );
      await expect(
        page.getByRole('button', { name: 'Tentar novamente' }),
      ).toHaveCount(value === 500 ? 1 : 0);
      expect(new URL(page.url()).searchParams.get('apagadas')).toBe('1');
      expect(new URL(page.url()).hash).toBe('#serie');
    }
  }
});

test('erros no shell têm foco, temas, teclado e reflow; falha de render também é contida', async ({
  page,
}, testInfo) => {
  let status = 404;
  let renderFailure = false;
  await page.route(fixture + '/testes/rota?*', (route) =>
    route.fulfill({
      status: renderFailure ? 200 : status,
      body: 'DETALHE_PRIVADO',
      headers: renderFailure ? { 'X-Test-Render-Failure': '1' } : {},
    }),
  );
  for (const value of [404, 405, 500] as const) {
    status = value;
    await page.goto(`${fixture}/painel/analises${suffix}`);
    await page.reload();
    const title = page.getByRole('heading', { name: titles[value] });
    await expect(title).toBeFocused();
    for (const theme of ['Claro', 'Escuro']) {
      await page.getByRole('button', { name: 'Opções', exact: true }).click();
      await page.getByRole('radio', { name: theme, exact: true }).check();
      await page.getByRole('button', { name: 'Fechar opções' }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`erro-recurso-${value}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  if (testInfo.project.name.endsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('erro-recurso-320.png'),
      fullPage: true,
    });
  }
  renderFailure = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: titles[500] })).toBeFocused();
  await expect(page.locator('main')).not.toContainText(
    /DETALHE_INTERNO|DETALHE_PRIVADO/,
  );
  await expect(
    page.getByRole('link', { name: 'Voltar para Painel' }),
  ).toHaveAttribute('href', `/painel${suffix}`);
});

test('tentativa explícita faz só GET, bloqueia clique duplicado e mantém histórico/filtros', async ({
  page,
}) => {
  let calls = 0;
  let recover = false;
  let release: (() => void) | undefined;
  const methods: string[] = [];
  await page.route(fixture + '/testes/rota?*', async (route) => {
    calls++;
    methods.push(route.request().method());
    if (recover)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route.fulfill({ status: recover ? 200 : 500, body: 'PRIVATE' });
  });
  await page.goto(`${fixture}/painel/analises${suffix}`);
  await expect(page.getByRole('heading', { name: titles[500] })).toBeFocused();
  expect(calls).toBe(1);
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'preservado';
  });
  recover = true;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect.poll(() => calls).toBe(2);
  await expect(
    page.getByRole('button', { name: 'Abrindo página…' }),
  ).toBeDisabled();
  release!();
  await expect(
    page.getByRole('heading', { name: 'Análises', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#conteudo')).toBeFocused();
  expect(methods).toEqual(['GET', 'GET']);
  expect(new URL(page.url()).searchParams.get('casa')).toBe('Bet 365');
  expect(new URL(page.url()).hash).toBe('#serie');
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.navigationMarker,
    ),
  ).toBe('preservado');
});

test('429/503 respeitam prazo e escrita incerta não oferece reenvio; flags da fixture não entram no produto', async ({
  page,
}) => {
  await page.clock.install();
  let status = 429;
  let uncertain = false;
  let calls = 0;
  await page.route(fixture + '/testes/rota?*', (route) => {
    calls++;
    return route.fulfill({
      status,
      body: 'PRIVATE',
      headers: uncertain
        ? { 'X-Test-Outcome-Unknown': '1' }
        : { 'Retry-After': '2' },
    });
  });
  for (const value of [429, 503]) {
    status = value;
    await page.goto(`${fixture}/coleta${suffix}`);
    await page.reload();
    await expect(
      page.getByRole('heading', {
        name:
          value === 429
            ? 'Aguarde para tentar novamente'
            : 'O serviço está temporariamente indisponível',
      }),
    ).toBeFocused();
    const count = calls;
    await expect(
      page.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeDisabled();
    await page.getByRole('link', { name: 'Abrir tutorial' }).focus();
    await page.clock.runFor(2000);
    await expect(
      page.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeEnabled();
    await expect(
      page.getByRole('link', { name: 'Abrir tutorial' }),
    ).toBeFocused();
    expect(calls).toBe(count);
  }
  status = 500;
  uncertain = true;
  await page.goto(`${fixture}/enviar${suffix}`);
  await expect(
    page.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toHaveCount(0);
  await page.goto('/tutorial?falha_rota=500&fixtureRenderFailure=true');
  await expect(
    page.getByRole('heading', { name: 'Tutorial', exact: true }),
  ).toBeVisible();
  await page.goto('/testes/rota?pagina=/painel&status=500');
  await expect(
    page.getByRole('heading', { name: 'Não achei esta página' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal', exact: true }),
  ).toHaveCount(0);
});
