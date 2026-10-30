import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  rules: {
    // Vue-specific rules
    'vue/html-self-closing': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'warn',
    'vue/require-prop-types': 'error',
    // Nuxt 4 pages support multiple root elements (Teleport + PageContainer pattern)
    'vue/no-multiple-template-root': 'off',

    // TypeScript rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // General JavaScript/TypeScript
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },
});
