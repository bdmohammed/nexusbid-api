import type { Config } from 'jest';

const config: Config = {
  // -- Preset & Transformer ---------------------------------------------------
  preset: 'ts-jest',
  testEnvironment: 'node',

  // -- Root & Match -----------------------------------------------------------
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],

  // -- Module path aliases (mirrors tsconfig paths) ---------------------------
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@entities/(.*)$': '<rootDir>/src/database/entities/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@jobs/(.*)$': '<rootDir>/src/jobs/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@search/(.*)$': '<rootDir>/src/search/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },

  // -- Global setup / teardown (run once, in a separate process) -------------
  // globalSetup   : initializes AppDataSource + runs migrations on test DB
  // globalTeardown: safety-net that destroys any lingering DataSource pool
  globalSetup: '<rootDir>/tests/jest.global-setup.ts',
  globalTeardown: '<rootDir>/tests/jest.global-teardown.ts',

  // -- Setup files ------------------------------------------------------------

  // 1) Runs BEFORE the test framework is installed (before any module import).
  //    Loads .env.test into process.env so env.ts Zod validation succeeds.
  setupFiles: ['<rootDir>/tests/jest.env-setup.ts'],

  // 2) Runs AFTER the test framework is installed (beforeAll/afterAll available).
  //    Handles DB lifecycle, mock clearing, and graceful teardown.
  setupFilesAfterFramework: ['<rootDir>/tests/jest.setup.ts'],

  // -- Performance ------------------------------------------------------------
  // Run serially -- integration tests share a single DB + TypeORM DataSource.
  // Parallel execution causes singleton conflicts + FK ordering issues.
  maxWorkers: 1,

  // -- TypeScript config ------------------------------------------------------
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },

  // -- Timeouts ---------------------------------------------------------------
  // Integration tests with DB + bcrypt need more time than unit tests.
  testTimeout: 30_000,

  // -- Coverage ---------------------------------------------------------------
  collectCoverageFrom: [
    'src/modules/auth/**/*.ts',
    'src/middleware/authenticate.ts',
    'src/middleware/authorize.ts',
    'src/services/token.service.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',

  // -- Output -----------------------------------------------------------------
  verbose: true,
};

export default config;
