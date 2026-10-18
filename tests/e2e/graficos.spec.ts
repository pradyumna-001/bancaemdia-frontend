import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('gráficos têm leitura por teclado, toque, tabela e ambos os temas', async ({
  page,
}, testInfo) => {
  await page.goto('http://127.0.0.1:4175/sistema');
  await expect(
    page.getByRole('heading', { name: 'Sistema', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Demonstração com dados fictícios.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('Acumulado até 29/09/2026')).toBeVisible();
  await expect(page.locator('.grafico-total')).toHaveText([
    '+R$ 180,00',
    '+R$ 180,00',
  ]);
  await expect(page.getByText('29 apostas · 3 grupos exibidos')).toBeVisible();
  await expect(page.locator('.grafico-marca')).toHaveCount(3);
  const datas = page.locator('.grafico-data');
  expect(await datas.count()).toBeGreaterThan(0);
  const caixas = await datas.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    }),
  );
  for (let i = 1; i < caixas.length; i++)
    expect(caixas[i]!.left).toBeGreaterThan(caixas[i - 1]!.right);
  await expect(page.locator('.serie-valores table')).toBeVisible();
  await expect(page.locator('.serie-valores tbody tr')).toHaveCount(5);
  await expect(page.getByText('Primeiro registro · 01/09/2026')).toBeVisible();
  const ponto = page.getByRole('button', {
    name: '03/09/2026: −R$ 120,00',
    exact: true,
  });
  await ponto.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tooltip')).toHaveText('03/09/2026: −R$ 120,00');
  expect(await ponto.evaluate((el) => getComputedStyle(el).stroke)).toBe(
    'rgba(0, 0, 0, 0)',
  );
  const indicador = page.locator('.ponto-selecionado .grafico-indicador');
  const destaque = await indicador.boundingBox();
  expect(destaque!.width).toBeLessThan(20);
  await page.screenshot({
    path: testInfo.outputPath('graficos-foco.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const alvo = await ponto.boundingBox();
  expect(alvo!.width).toBeGreaterThanOrEqual(44);
  expect(alvo!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: /Grupo Sul/ }).click();
  await expect(page.getByRole('tooltip')).toHaveText(
    'Grupo Sul: −R$ 120,00 · 4 apostas',
  );
  await page.getByText('Ver dados da comparação', { exact: true }).click();
  await expect(page.getByRole('table')).toHaveCount(2);
  await expect(page.getByRole('table').first().getByRole('row')).toHaveCount(6);
  for (const tema of ['Claro', 'Escuro']) {
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    await page.getByRole('radio', { name: tema, exact: true }).check();
    await page.keyboard.press('Escape');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('graficos-' + tema + '.png'),
      fullPage: true,
    });
  }
});

test('cenários de borda permanecem legíveis em 320px e gráficos continuam protegidos', async ({
  page,
}, testInfo) => {
  await page.goto('/sistema');
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible();
  await page.goto('http://127.0.0.1:4175/sistema');
  if (page.viewportSize()!.width < 700)
    await page.setViewportSize({ width: 320, height: 568 });
  for (const cenario of ['Sem dados', 'Um ponto', 'Zero', 'Extremos']) {
    await page.getByRole('radio', { name: cenario, exact: true }).check();
    if (cenario === 'Sem dados') {
      await expect(
        page.getByText('Sem dados de evolução', { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByText('Sem grupos para comparar.', { exact: false }),
      ).toBeVisible();
    } else {
      await expect(page.locator('.serie-valores table')).toBeVisible();
      await page.getByText('Ver dados da comparação', { exact: true }).click();
      expect(
        await page
          .locator('svg')
          .evaluateAll((svgs) =>
            svgs.every((svg) => !/NaN|Infinity/.test(svg.innerHTML)),
          ),
      ).toBe(true);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (page.viewportSize()!.width < 700) {
    const tabela = page.getByRole('region', { name: /^Tabela da comparação/ });
    await tabela.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => tabela.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  }
  await page.screenshot({
    path: testInfo.outputPath('graficos-extremos.png'),
    fullPage: true,
  });
});
