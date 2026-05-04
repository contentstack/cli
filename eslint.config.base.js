import tseslint from 'typescript-eslint';

export const typescriptConfig = tseslint.configs.recommended;

export const baseRules = {
  eqeqeq: ['error', 'smart'],
  'id-match': 'error',
  'no-eval': 'error',
  'no-var': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
  '@typescript-eslint/prefer-namespace-keyword': 'error',
  semi: 'off',
  '@typescript-eslint/no-redeclare': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
};
