/**
 * jest.global-teardown.ts -- Jest `globalTeardown`.
 *
 * Runs ONCE after all test suites complete. Safety net for cases where
 * a test file crashes before its afterAll() can destroy the DataSource.
 * Prevents the pg pool from keeping the Jest process alive (no --forceExit).
 */
import dotenv from 'dotenv';
import path from 'path';

export default async function globalTeardown(): Promise<void> {
  process.env['NODE_ENV'] = 'test';
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

  try {
    const { AppDataSource } = await import('../src/config/database');
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('[globalTeardown] DataSource destroyed');
    }
  } catch {
    // Already destroyed -- nothing to do
  }
}
