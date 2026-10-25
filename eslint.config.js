// Configurazione ESLint per tutto il monorepo (formato "flat config" di ESLint 9).
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'apps/api/data/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Frontend: codice che gira nel browser, con le regole degli hook di React.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Backend e file di configurazione: codice che gira in Node.js.
  {
    files: ['apps/api/**/*.ts', '**/*.config.{js,ts}', 'apps/web/scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  {
    rules: {
      // Le variabili inutilizzate sono errori, tranne quelle che iniziano con _ (scelta esplicita).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // "import type" per i soli tipi: spariscono dal codice compilato.
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'always'],
    },
  },

  // Va per ultimo: disattiva le regole di stile che Prettier gestisce già.
  prettier,
);
