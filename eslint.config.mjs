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
      'dist-filtros-fixture/**',
      'dist-filtros-security/**',
      'dist-enviar-fixture/**',
      'dist-assinatura-fixture/**',
      'dist-calculadoras-fixture/**',
      'dist-telegram-fixture/**',
      'dist-configuracoes-fixture/**',
      'dist-painel-fixture/**',
      'dist-contas-fixture/**',
      'dist-midia-fixture/**',
      'dist-prints-fixture/**',
      'dist-planilha-fixture/**',
      'dist-resultados-fixture/**',
      'dist-caixa-fixture/**',
      'dist-revisao-fixture/**',
      'dist-privacidade-fixture/**',
      'dist-manual-fixture/**',
      'dist-coleta-fixture/**',
      'dist-analises-fixture/**',
      'dist-troca-fixture/**',
      'dist-metas-fixture/**',
      'dist-analises-proposta/**',
      'dist-hipotetica-fixture/**',
      'dist-apostas-fixture/**',
      'dist-apostas-security/**',
      'dist-painel-proposta/**',
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
      'tests/fixtures/telegram/*.tsx',
      'tests/fixtures/painel-proposta/*.tsx',
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
