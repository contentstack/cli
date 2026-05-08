import { typescriptConfig, baseRules } from '../../eslint.config.base.js';

export default [
  ...typescriptConfig,
  {
    files: ['src/**/*.ts'],
    rules: baseRules,
  },
  {
    ignores: ['lib/**'],
  },
];
