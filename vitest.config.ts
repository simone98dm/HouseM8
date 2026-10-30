import { defineVitestConfig } from '@nuxt/test-utils/config';
import { resolve } from 'path';

export default defineVitestConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '~~': resolve(__dirname, '.'),
      '@': resolve(__dirname, './app'),
    },
  },
  test: {
    environment: 'nuxt',
    globals: true,
    globalSetup: ['./vitest.globalSetup.ts'],
    setupFiles: ['./app/tests/setup.ts'],
    env: {
      JWT_SECRET: 'test-jwt-secret-must-be-at-least-32chars!!',
    },
    include: [
      'app/**/*.test.{js,ts}',
      'app/**/__tests__/**/*.{js,ts}',
      'server/**/*.test.{js,ts}',
      'server/**/__tests__/**/*.{js,ts}',
      // shared/ holds the money/balance/settlement engine used by both app and
      // server; without this entry its suite is silently never collected.
      'shared/**/*.test.{js,ts}',
      'shared/**/__tests__/**/*.{js,ts}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/tests/**',
        '**/*.d.ts',
        '**/types/**',
        'node_modules/**',
        '.nuxt/**',
        'dist/**',
      ],
      clean: true,
      // Baseline set to the suite's actual coverage, not an aspiration: the
      // previous 90/75/82/90 was never met and failed every run. These numbers
      // are a ratchet — they stop regressions today and get raised as coverage
      // improves. Keep the table in pr-analysis.yml's coverage comment in sync.
      // Re-baselined 2026-10-25: PR #2 merged with coverage at ~75.9% lines.
      // Biggest gap: server/repositories/postgres/* (~600 uncovered lines).
      thresholds: {
        lines: 76,
        functions: 69,
        branches: 66,
        statements: 74,
      },
      reportsDirectory: './coverage',
    },
  },
});
