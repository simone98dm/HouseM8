import withNuxt from './.nuxt/eslint.config.mjs';
import eslintConfigPrettier from 'eslint-config-prettier';

export default withNuxt(
  {
    ignores: [
      // Generated / build output
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'node_modules/**',

      // Test coverage / reports
      'coverage/**',
      'lighthouse-report.html',
      'graphify-out/**',

      // Config files that don't need linting
      'commitlint.config.*',
      'postcss.config.*',
      '*.d.ts',
    ],
  },
  eslintConfigPrettier,
  {
    rules: {
      'no-console': 'warn',
      'vue/no-multiple-root': 'off',
      'vue/no-multiple-template-root': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/html-self-closing': 'off',
    },
  },
  {
    // Plain JS is parsed by espree, which has no type info: the typescript-eslint
    // rule then reports every used variable as "only used as a type". Use the
    // core rule, with the same options, for these files.
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // ponytail: no-useless-assignment (ESLint 10 recommended) flags ~40 tests
    // that assert on local variables instead of the component. Off for tests
    // only; rewrite those tests to drive the real component, then remove this.
    files: ['**/__tests__/**', '**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
    rules: {
      'no-useless-assignment': 'off',
    },
  },
);
