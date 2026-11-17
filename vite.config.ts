import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/SimpleRpg/',
  test: { include: ['tests/**/*.test.ts'] },
});
