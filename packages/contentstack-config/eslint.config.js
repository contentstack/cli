import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import mochaPlugin from 'eslint-plugin-mocha';
import { FlatCompat } from '@eslint/eslintrc';
import { baseRules } from '../../eslint.config.base.js';

const compat = new FlatCompat();

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.config(mochaPlugin.configs.recommended),
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      ...baseRules,
      'unicorn/no-abusive-eslint-disable': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      indent: 'off',
      'object-curly-spacing': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'mocha/no-async-describe': 'off',
      'mocha/no-identical-title': 'off',
      'mocha/no-mocha-arrows': 'off',
      'mocha/no-setup-in-describe': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'prefer-const': 'error',
      'no-fallthrough': 'error',
      'no-prototype-builtins': 'off',
    },
  },
  {
    files: ['*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['lib/**'],
  },
];
