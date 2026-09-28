import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Schichtregeln (docs/ARCHITEKTUR.md, Abschnitt 1): Abhängigkeiten nur in Pfeilrichtung.
 * Schichtübergreifende Importe laufen über den Alias `@/`, damit diese Regeln greifen.
 */
const layer = (name) => [`@/${name}`, `@/${name}/*`, `**/${name}/**`];

const layerRules = [
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    forbidden: [
      ...layer('ui'),
      ...layer('features'),
      ...layer('data'),
      ...layer('platform'),
      ...layer('app'),
      'react',
      'react-dom',
      'react-router',
      'dexie',
    ],
    message: 'domain/ ist reine Fachlogik ohne Browser-, React- oder Datenbankabhängigkeiten.',
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    forbidden: [...layer('ui'), ...layer('features'), ...layer('platform'), 'react', 'react-dom'],
    message: 'data/ darf nur domain/ (Typen) verwenden.',
  },
  {
    files: ['src/platform/**/*.{ts,tsx}'],
    forbidden: [...layer('ui'), ...layer('features'), ...layer('data'), 'react', 'react-dom'],
    message: 'platform/ kapselt Browser-APIs und kennt keine höheren Schichten.',
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    forbidden: [...layer('ui')],
    message: 'features/ enthält Anwendungsfälle ohne Oberfläche.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'design/',
      'node_modules/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { parserOptions: { project: null, projectService: false } },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  ...layerRules.map(({ files, forbidden, message }) => ({
    files,
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: forbidden, message }] }],
    },
  })),
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['src/app/router.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
    },
  },
);
