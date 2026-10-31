import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './painel-proposta',
  testMatch: '*.spec.ts',
  retries: 0,
  reporter: 'list',
  outputDir: '../../reports/painel-proposta',
  use: { baseURL: 'http://127.0.0.1:4197', screenshot: 'only-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].flatMap((browser) =>
    [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1440, height: 900 },
    ].map((v) => ({
      name: `${browser}-${v.name}`,
      use: {
        browserName: browser as 'chromium' | 'firefox' | 'webkit',
        viewport: { width: v.width, height: v.height },
      },
    })),
  ),
  webServer: {
    command:
      'pnpm exec vite build --config tests/fixtures/painel-proposta.vite.config.ts && pnpm exec vite preview --config tests/fixtures/painel-proposta.vite.config.ts --host 127.0.0.1 --port 4197 --strictPort',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: !process.env.CI,
  },
});
