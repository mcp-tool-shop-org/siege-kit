import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      reporter: ['text', 'lcov'],
    },
    // Benchmark configuration
    benchmark: {
      include: ['src/**/*.bench.ts'],
      reporters: ['default'],
    },
  },
});
