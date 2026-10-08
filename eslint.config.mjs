import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { regraPaleta } from './scripts/paleta.mjs';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-security/**',
      'dist-shell-fixture/**',
      'dist-acesso-fixture/**',
      'dist-assinatura-fixture/**',
      'dist-calculadoras-fixture/**',
      'dist-filtros-fixture/**',
      'dist-filtros-security/**',
      'dist-enviar-fixture/**',
      'coverage/**',
      'reports/**',
      'playwright-report/**',
      'test-results/**',
      '.husky/_/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'tests/fixtures/shell/*.tsx',
      'tests/fixtures/acesso/*.tsx',
      'tests/fixtures/calculadoras/*.tsx',
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.{js,ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    plugins: { paleta: { rules: { 'so-tokens': regraPaleta } } },
    rules: { 'paleta/so-tokens': 'error' },
  },
  {
    files: ['src/styles/tema-inicial.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
