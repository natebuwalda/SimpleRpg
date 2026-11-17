import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 4,
  use: {
    baseURL: 'http://127.0.0.1:4173/SimpleRpg/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/SimpleRpg/',
    reuseExistingServer: true,
  },
});
