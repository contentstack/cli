import { typescriptConfig, baseRules } from '../../eslint.config.base.js';

export default [
  ...typescriptConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      ...baseRules,
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
  {
    ignores: ['lib/**'],
  },
];
