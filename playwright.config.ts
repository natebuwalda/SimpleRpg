import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? join(tmpdir(), 'simple-rpg-playwright'),
  fullyParallel: true,
  timeout: 60_000,
  workers: 4,
  use: {
    baseURL: 'http://127.0.0.1:4180/SimpleRpg/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180/SimpleRpg/',
    reuseExistingServer: !process.env.CI,
  },
});
