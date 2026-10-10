import { defineConfig } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'] as const;
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: browsers.flatMap((browserName) =>
    viewports.map(({ name, width, height }) => ({
      name: `${browserName}-${name}`,
      use: { browserName, viewport: { width, height } },
    })),
  ),
  webServer: [
    {
      command:
        'pnpm exec vite build --config tests/fixtures/configuracoes.vite.config.ts && pnpm exec vite preview --config tests/fixtures/configuracoes.vite.config.ts --host 127.0.0.1 --port 4179 --strictPort',
      url: 'http://127.0.0.1:4179',
      reuseExistingServer: false,
    },
    {
      command:
        'pnpm exec vite build --config tests/fixtures/acesso.vite.config.ts && pnpm exec vite preview --config tests/fixtures/acesso.vite.config.ts --host 127.0.0.1 --port 4178 --strictPort',
      url: 'http://127.0.0.1:4178',
      reuseExistingServer: false,
    },
    {
      env: {
        VITE_API_URL: 'http://127.0.0.1:8000',
        VITE_APP_ENV: 'production',
        VITE_UPLOAD_POLL_MS: '1000',
      },
      command:
        'pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
    {
      command:
        'pnpm exec vite build --config tests/fixtures/shell.vite.config.ts && pnpm exec vite preview --config tests/fixtures/shell.vite.config.ts --host 127.0.0.1 --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: false,
    },
    {
      command:
        'pnpm exec vite build --config tests/fixtures/enviar.vite.config.ts && pnpm exec vite preview --config tests/fixtures/enviar.vite.config.ts --host 127.0.0.1 --port 4176 --strictPort',
      url: 'http://127.0.0.1:4176',
      reuseExistingServer: false,
    },
  ],
});
