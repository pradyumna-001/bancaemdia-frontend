import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const configPath = 'config/local.json';
const originalConfig = await readFile(configPath, 'utf8');
try {
  for (const [name, browserType] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      let originalBundle;
      for (const appEnv of ['staging', 'production']) {
        await writeFile(
          configPath,
          JSON.stringify({
            VITE_API_URL: `https://${appEnv}.example.com`,
            VITE_APP_ENV: appEnv,
          }),
        );
        await page.goto('http://127.0.0.1:8080');
        await expect(
          page.getByRole('heading', { name: 'bancaemdia', exact: true }),
        ).toBeVisible();
        const bundle = await page
          .locator('script[type="module"]')
          .getAttribute('src');
        originalBundle ??= bundle;
        assert.equal(bundle, originalBundle);
        const response = await page.request.get(
          'http://127.0.0.1:8080/config.json',
        );
        assert.equal((await response.json()).VITE_APP_ENV, appEnv);
      }
      await writeFile(configPath, '{}');
      await page.reload();
      await expect(page.getByRole('alert')).toContainText(
        'Informe a URL da API',
      );
      await writeFile(configPath, '{invalid');
      await page.reload();
      await expect(page.getByRole('alert')).toContainText(
        'Não foi possível ler a configuração',
      );
      await writeFile(configPath, originalConfig);
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(
        page.getByRole('heading', { name: 'bancaemdia', exact: true }),
      ).toBeVisible();
      await page.goto('http://127.0.0.1:8081');
      await expect(page.getByRole('alert')).toContainText(
        'Não foi possível carregar a configuração',
      );
      assert.deepEqual(errors, []);
      console.log(
        `${name}: imagem sem URL no build, staging/production no mesmo bundle, JSON inválido/ausente e recuperação aprovados`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await writeFile(configPath, originalConfig);
}

const browser = await chromium.launch();
try {
  for (const [label, value] of [
    ['mínima', 'http://127.0.0.1:8000'],
    ['ausente', undefined],
    ['inválida', '/api'],
  ]) {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('VITE_')),
    );
    if (value !== undefined) env.VITE_API_URL = value;
    const server = spawn(
      'pnpm',
      ['exec', 'vite', '--host', '127.0.0.1', '--port', '5175', '--strictPort'],
      { env, stdio: ['ignore', 'pipe', 'inherit'], detached: true },
    );
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Vite não iniciou')),
          15000,
        );
        server.stdout.on('data', (data) => {
          if (data.toString().includes('5175')) {
            clearTimeout(timeout);
            resolve();
          }
        });
        server.on('error', reject);
        server.on('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error(`Vite encerrou com ${code}`));
        });
      });
      const page = await browser.newPage();
      let configRequests = 0;
      page.on('request', (request) => {
        if (request.url().endsWith('/config.json')) configRequests++;
      });
      await page.goto('http://127.0.0.1:5175');
      if (label === 'mínima') {
        await expect(
          page.getByRole('heading', { name: 'bancaemdia', exact: true }),
        ).toBeVisible();
      } else {
        await expect(page.getByRole('alert')).toContainText('VITE_API_URL');
        await expect(page.getByText('Aplicação em preparação.')).toHaveCount(0);
      }
      assert.equal(configRequests, 0);
      await page.close();
      console.log(`dev com URL ${label}: aprovado`);
    } finally {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      process.kill(-server.pid, 'SIGTERM');
      await exited;
    }
  }
} finally {
  await browser.close();
}
