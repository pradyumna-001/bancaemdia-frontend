import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { detalheExemplo, revisaoDePar } from '../fixtures/detalhe';
import { billingStatus } from '../fixtures/acesso';
import type {
  Correcao,
  Detalhe,
} from '../../src/features/apostas/detalhe/protocol';
import { readFileSync } from 'node:fs';
import { securityConfig } from '../../scripts/build-csp.mjs';
const exercise = 'http://127.0.0.1:4180';
async function api(
  page: Page,
  data: Detalhe = structuredClone(detalheExemplo),
) {
  const writes: Array<{ method: string; path: string; body: unknown }> = [];
  let handle: ((route: Route) => Promise<void>) | undefined;
  await page.route(
    /\/api\/v1\/apostas\/exemplo-1(?:\/[^?]+)?(?:\?|$)/,
    async (route) => {
      if (handle) return handle(route);
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (req.method() === 'GET') return route.fulfill({ json: data });
      const body = req.postDataJSON() as Correcao;
      writes.push({ method: req.method(), path, body });
      if (req.method() === 'DELETE') data.aposta.apagada = true;
      else if (path.endsWith('/restaurar')) data.aposta.apagada = false;
      else if (path.endsWith('/resultado')) data.aposta.estado = body.estado!;
      else {
        if (body.evento !== undefined) data.aposta.evento = body.evento;
        if (body.descricao !== undefined)
          data.aposta.descricao = body.descricao;
      }
      return route.fulfill({
        json: { aposta: data.aposta, eventos_gravados: 1 },
      });
    },
  );
  return {
    writes,
    data,
    handle: (fn: typeof handle) => {
      handle = fn;
    },
  };
}
test('detalhe preserva a lista densa, filtros, seção e contexto; Claro/Escuro/teclado/320px', async ({
  page,
}, info) => {
  await api(page);
  await page.goto(exercise + '/?page_size=50&casa=7&visualizacao=lista');
  await expect(page.getByRole('article')).toHaveCount(30);
  await page
    .getByRole('link', { name: 'Flamengo × Palmeiras', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(
    /\/aposta\/exemplo-1\?page_size=50&casa=7&visualizacao=lista$/,
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Flamengo × Palmeiras' }),
  ).toBeVisible();
  await expect(page.getByText('Conta principal (inativa)')).toBeVisible();
  await expect(page.getByText('Ana (arquivado)')).toBeVisible();
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`detalhe-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByText('Histórico da aposta (2)').click();
  await expect(
    page.getByRole('heading', { name: 'Resultado registrado' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('link', { name: 'Voltar à lista de apostas', exact: false })
    .click();
  await expect(page).toHaveURL(/visualizacao=lista#aposta-exemplo-1$/);
  await expect(page.getByRole('article')).toHaveCount(30);
  await expect(
    page.getByRole('link', { name: 'Flamengo × Palmeiras', exact: true }),
  ).toBeFocused();
});
test('correção envia somente campos alterados; exclusão/restauração confirmadas, sem cálculos locais', async ({
  page,
}, info) => {
  const app = await api(page);
  await page.goto(
    exercise + '/aposta/exemplo-1?casa=7&apagadas=todas&visualizacao=lista',
  );
  await page
    .getByRole('button', { name: 'Corrigir aposta', exact: true })
    .click();
  await page.getByLabel('Evento', { exact: true }).fill('Evento corrigido');
  await page.getByLabel('Descrição', { exact: true }).fill('');
  for (const theme of ['claro', 'escuro']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-tema', value),
      theme,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`correcao-${theme}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Evento corrigido' }),
  ).toBeVisible();
  expect(app.writes[0]!.body).toEqual({
    evento: 'Evento corrigido',
    descricao: null,
  });
  await expect(page.getByText('+R$ 15,00')).toBeVisible();
  await page
    .getByRole('button', { name: 'Apagar aposta', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Apagar aposta?' });
  await expect(dialog.getByRole('button', { name: 'Agora não' })).toBeFocused();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Evento corrigido' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(
    page.getByText('Apagada — fora da apuração.', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Restaurar aposta', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(
    page.getByText('Apagada — fora da apuração.', { exact: false }),
  ).toHaveCount(0);
  expect(app.writes.map((w) => w.method)).toEqual(['PATCH', 'DELETE', 'POST']);
});
test('conta histórica tem seleção explícita e sem atribuição pelo cliente', async ({
  page,
}, info) => {
  const writes: unknown[] = [];
  await page.route('**/api/v1/apostas/exemplo-1', async (route) => {
    if (route.request().method() === 'PATCH') {
      writes.push(route.request().postDataJSON());
      return route.fulfill({
        json: { aposta: detalheExemplo.aposta, eventos_gravados: 1 },
      });
    }
    return route.fulfill({ json: detalheExemplo });
  });
  await page.goto(exercise + '/aposta/exemplo-1');
  await page.getByRole('button', { name: 'Escolher conta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Conta que fez a aposta' });
  await expect(
    dialog.getByRole('button', { name: 'Confirmar conta' }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Ana (arquivado)' }).click();
  await dialog
    .getByRole('radio', {
      name: 'Conta histórica — Betano (inativa)',
      exact: false,
    })
    .check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('conta-historica.png') });
  await dialog.getByRole('button', { name: 'Confirmar conta' }).click();
  await expect(
    page.getByText('Alteração confirmada.', { exact: false }),
  ).toBeVisible();
  expect(writes).toEqual([{ conta_casa_id: 4 }]);
});
test('resposta incerta e 409 exigem consulta explícita antes de nova intenção, sem replay', async ({
  page,
}) => {
  const app = await api(page);
  let mutations = 0;
  app.handle(async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: app.data });
    mutations++;
    return route.fulfill({ status: 409, json: { detail: 'segredo' } });
  });
  await page.goto(exercise + '/aposta/exemplo-1');
  await page
    .getByRole('button', { name: 'Corrigir aposta', exact: true })
    .click();
  await page.getByLabel('Evento', { exact: true }).fill('Entrada preservada');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    page.getByRole('button', { name: 'Salvar alterações' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Evento', { exact: true })).toHaveValue(
    'Entrada preservada',
  );
  await page
    .getByRole('button', { name: 'Consultar estado atual da aposta' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Salvar alterações' }),
  ).toBeEnabled();
  expect(mutations).toBe(1);
  app.handle(async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: app.data });
    mutations++;
    return route.abort('failed');
  });
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(
    page.getByRole('heading', { name: 'Confira se o pedido foi concluído' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Salvar alterações' }),
  ).toBeDisabled();
  expect(mutations).toBe(2);
  await expect(page.getByText('segredo', { exact: true })).toHaveCount(0);
});
test('READ_ONLY/freebet/nulos e 404/405/503 não deixam tela morta', async ({
  page,
}) => {
  await page.route('**/api/v1/billing/status', (route) =>
    route.fulfill({ json: { ...billingStatus, access: 'READ_ONLY' } }),
  );
  const app = await api(page, {
    ...structuredClone(detalheExemplo),
    aposta: {
      ...detalheExemplo.aposta,
      freebet: true,
      stake_centavos: 0,
      retorno_centavos: null,
      lucro_centavos: null,
    },
  });
  await page.goto(exercise + '/aposta/exemplo-1?casa=7');
  await expect(
    page.getByRole('button', { name: 'Corrigir aposta', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText('Valor de face da freebet')).toBeVisible();
  await expect(page.getByText('R$ 0,00')).toBeVisible();
  for (const status of [404, 405, 503]) {
    app.handle((route) =>
      route.fulfill({ status, json: { detail: 'segredo' } }),
    );
    await page.reload();
    // A leitura segura esgota o backoff publicado antes de exibir o erro final.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('link', {
        name: 'Voltar à lista de apostas',
        exact: false,
      }),
    ).toHaveAttribute('href', '/?casa=7#aposta-exemplo-1');
    if (status !== 503)
      await expect(
        page.getByRole('button', { name: 'Tentar novamente' }),
      ).toHaveCount(0);
    else
      await expect(
        page.getByRole('button', { name: 'Tentar novamente' }),
      ).toBeVisible();
  }
});
test('par legado e resultado usam apenas endpoints publicados e confirmação', async ({
  page,
}) => {
  const config = securityConfig(
    readFileSync('dist-apostas-fixture/index.html', 'utf8'),
    readFileSync('nginx/default.conf', 'utf8'),
  );
  const csp = /Content-Security-Policy "([^"]+)"/.exec(config)![1]!;
  await page.route(exercise + '/aposta/**', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });
  await page.addInitScript(() => {
    (window as Window & { photoCspFailed?: boolean }).photoCspFailed = false;
    document.addEventListener('securitypolicyviolation', () => {
      (window as Window & { photoCspFailed?: boolean }).photoCspFailed = true;
    });
  });
  const app = await api(page, {
    ...structuredClone(detalheExemplo),
    revisao_pendente: {
      id: 8,
      motivo: 'duvida_de_par',
      criado_em: '2026-10-10T12:00:00Z',
      midia_hash: null,
    },
  });
  await page.route('**/api/v1/revisao/8', (route) =>
    route.fulfill({
      json: revisaoDePar,
    }),
  );
  let photoReads = 0;
  await page.route('**/api/v1/revisao/8/foto', (route) => {
    photoReads++;
    return route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });
  const resolutions: unknown[] = [];
  await page.route('**/api/v1/revisao/8/resolver', async (route) => {
    resolutions.push(route.request().postDataJSON());
    app.data.revisao_pendente = null;
    return route.fulfill({
      json: {
        aposta: app.data.aposta,
        eventos_gravados: 1,
        acao: 'MESMA',
        revisao: { id: 8, resolvido_em: '2026-10-10T12:30:00Z' },
      },
    });
  });
  await page.goto(exercise + '/aposta/exemplo-1?casa=7');
  await expect(
    page.getByRole('button', { name: 'Abrir foto da revisão' }),
  ).toBeVisible();
  expect(photoReads).toBe(0);
  await page.getByRole('button', { name: 'Abrir foto da revisão' }).click();
  const photo = page.getByRole('img', {
    name: 'Evidência da revisão desta aposta',
  });
  await expect(photo).toBeVisible();
  await expect
    .poll(() =>
      photo.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  expect(photoReads).toBe(1);
  expect(
    await page.evaluate(
      () => (window as Window & { photoCspFailed?: boolean }).photoCspFailed,
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'É a mesma aposta' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(
    page.getByText('Alteração confirmada.', { exact: false }),
  ).toBeVisible();
  expect(resolutions).toEqual([{ acao: 'MESMA' }]);
  await expect(photo).toHaveCount(0);
  await page.getByText('Registrar resultado').click();
  await page.getByRole('radio', { name: 'Cashout', exact: true }).check();
  await page.getByLabel('Valor pago pela casa (R$)').fill('12,34');
  await page.getByRole('button', { name: 'Salvar resultado' }).click();
  await expect(
    page.getByText('Alteração confirmada.', { exact: false }),
  ).toBeVisible();
  expect(app.writes.at(-1)!.body).toEqual({
    estado: 'CASHOUT',
    cashout_valor_centavos: 1234,
  });
});
