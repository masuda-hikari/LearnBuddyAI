// ESLint Flat Config (v9対応)
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');

module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      // Prettier統合
      'prettier/prettier': 'error',

      // TypeScript固有
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // 一般
      'no-console': ['warn', { allow: ['log', 'error', 'warn'] }],
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'jest.config.js', 'eslint.config.js'],
  },
];
