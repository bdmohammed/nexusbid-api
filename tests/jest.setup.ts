/**
 * jest.setup.ts -- Jest `setupFilesAfterFramework`.
 *
 * Runs AFTER the Jest test framework is installed (beforeAll/afterAll
 * are available here). This file handles:
 *
 *   1. beforeAll  -- Initialize the shared AppDataSource (idempotent guard).
 *                    Skipped if globalSetup already initialized it (it won't
 *                    have since globalSetup destroys its connection).
 *
 *   2. afterAll   -- Destroy AppDataSource to drain the pg connection pool.
 *                    This is what eliminates the need for --forceExit.
 *
 *   3. beforeEach -- jest.clearAllMocks() so mock call counts never bleed
 *                    across tests (Issue #6).
 *
 * Why not do DB init in globalSetup?
 * globalSetup runs in a SEPARATE process. The DataSource it initializes is
 * not the one test files import. Each test worker needs its own connection.
 */
import { AppDataSource } from '../src/config/database';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}, 30_000);

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}, 30_000);

// Clear mock state before each test -- prevents call counts bleeding across tests
beforeEach(() => {
  jest.clearAllMocks();
});
