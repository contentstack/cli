import { typescriptConfig, baseRules } from '../../eslint.config.base.js';

export default [
  ...typescriptConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      ...baseRules,
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/quotes': 'off',
      '@typescript-eslint/type-annotation-spacing': 'off',
    },
  },
  {
    ignores: ['lib/**'],
  },
];
