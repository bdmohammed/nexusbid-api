import path, { dirname } from 'path';
import globals from 'globals';
import { fileURLToPath } from 'url';

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootTsConfigDir = __dirname;

// Base configuration factory
export const createBaseConfig = (options: any = {}) => {
  const {
    additionalGlobals = {},
    additionalPlugins = {},
    additionalRules = {},
    filePatterns = ['**/*.{js,ts}'],
    tsconfigRootDir = rootTsConfigDir,
  } = options;

  return {
    files: filePatterns,
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: false,
          generators: true,
          objectLiteralDuplicateProperties: false,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: tsconfigRootDir,
        projectService: true,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        ...additionalGlobals,
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
      prettier: prettier,
      unicorn: unicorn,
      sonarjs: sonarjs,
      security: security,
      ...additionalPlugins,
    },
    settings: {},
    rules: {
      // Basic rules
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'no-duplicate-imports': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': [
        'error',
        {
          ignoreDeclarationMerge: true,
        },
      ],

      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Development-time relaxed rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // Import/Export rules
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Built-in modules
            ['^node:(.*)$'],

            // External packages
            [
              '^react$',
              '^react-native$',
              '^@react-native/(.*)$',
              '^react/(.*)$',
              '^next/(.*)$',
              '^@next/(.*)$',
              '^@?\\w',
            ],

            // Internal/Parent imports
            [
              '^\\.\\.(?!/?$)', // ../something (not ending in / or empty)
              '^\\.\\./?$',
            ], // ../ or ..

            // Sibling imports
            [
              '^\\./(?=.*/)(?!/?$)', // ./something/ (with subdirectory)
              '^\\.(?!/?$)', // ./something (not ending in / or empty)
              '^\\./?$',
            ], // ./ or .

            // Style imports
            ['^.+\\.s?css$'], // .css, .scss files

            //index sort
            [
              '^\\./index$', // ./index
              '^\\.$',
            ], // .

            //object sort
            ['^\\{.*\\}'], // {something} from 'module'

            // Type imports (should be last)
            ['^.*\\u0000$', '^@/(.*)$', '^[./]'],
          ],
        },
      ],
      'max-len': [
        'error',
        {
          code: 120,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreUrls: true,
        },
      ],
      'simple-import-sort/exports': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',

      // General rules
      'no-console': 'error',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'prefer-spread': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],

      // Unicorn rules
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
            kebabCase: true,
          },
        },
      ],
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-top-level-await': 'off',

      // SonarJS rules
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-small-switch': 'off',
      complexity: ['error', 10],
      'spaced-comment': [2, 'always'],

      // Security
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',

      // Performance
      'no-await-in-loop': 'warn',
      'prefer-object-spread': 'error',

      // Prettier
      'prettier/prettier': [
        'error',
        {},
        {
          usePrettierrc: true,
        },
      ],

      // Custom overrides
      ...additionalRules,
    },
  };
};

// Test configuration factory
export const createTestConfig = (options: any = {}) => ({
  files: [
    '**/__tests__/**/*',
    '**/tests/**/*',
    '**/*.{test,spec}.{js,jsx,ts,tsx}',
    '**/jest-setup.{js,ts}',
    ...(options.additionalTestFiles ?? []),
  ],
  languageOptions: {
    globals: {
      jest: 'readonly',
      describe: 'readonly',
      it: 'readonly',
      test: 'readonly',
      expect: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
      beforeAll: 'readonly',
      afterAll: 'readonly',
      ...options.additionalGlobals,
    },
  },
  plugins: {
    jest: jest,
    'testing-library': testingLibrary,
    ...options.additionalPlugins,
  },
  rules: {
    'jest/expect-expect': 'off',
    'testing-library/prefer-screen-queries': 'error',
    'jest/prefer-to-have-length': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'sonarjs/no-duplicate-string': 'off',
    ...options.additionalRules,
  },
});

// Config files configuration factory
export const createConfigFilesConfig = (options: any = {}) => ({
  files: ['*.config.{js,mjs,cjs}', 'eslint.config.js', ...(options.additionalFiles ?? [])],
  languageOptions: {
    globals: {
      module: 'writable',
      require: 'readonly',
      __dirname: 'readonly',
      __filename: 'readonly',
      process: 'readonly',
      Buffer: 'readonly',
      global: 'readonly',
      ...options.additionalGlobals,
    },
    sourceType: 'commonjs',
  },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
    'unicorn/prefer-module': 'off',
    ...options.additionalRules,
  },
});

export const defaultIgnoresPath = [
  '**/*.log',
  '**/*.tsbuildinfo',
  '**/.nyc_output/**',
  '**/lib/**',
  '**/dist/**',
  '**/.esbuild/**',
  '**/test-output',
  '**/build/**',
  '**/coverage/**',
  '**/node_modules/**',
  '**/bin/**',
  '**/public/**',
  '**/*.tf',
  '**/.husky/**',
  '**/**.cjs',
  '**/*.min.js',
  '**/.next/**',
  '**/venv/**',
  '**/env/**',
  '**/**.env',
  '**/.vscode/**',
  '**/test-results/**',
  '**/.idea/**',
  '**/tools/**',
  '**/.github/**',
  '**/docs/**',
  '**/.build/**',
  '**/.prettierignore',
  'sonar-project.properties',
  '**/**.md',
  '**/**.json',
  '**/**.lock',
  '**/**.yaml',
  '**/**.yml',
  '.npmrc',
  '.nvmrc',
  '.editorconfig',
  '.gitignore',
  'eslint.config.js',
  'jest.config.js',
  'vite.config.ts',
  'playwright.config.ts',
  '**/*.config.js',
  '**/*.config.ts',
  'eslint.config.mjs',
  '.nx',
  'dist',
  'coverage',
  'node_modules',
  'build',
];

// Default export for root
export default [
  js.configs.recommended,
  createBaseConfig(),
  createTestConfig(),
  createConfigFilesConfig(),
  {
    ignores: defaultIgnoresPath,
  },
];
