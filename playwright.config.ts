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
  webServer: {
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
});
