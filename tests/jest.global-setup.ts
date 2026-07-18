/**
 * jest.global-setup.ts -- Jest `globalSetup`.
 *
 * Runs ONCE in a separate Node process before any test suite starts.
 *   1. Ensures NODE_ENV=test is set (so env.ts loads .env.test)
 *   2. Initializes the TypeORM DataSource
 *   3. Runs all pending migrations against the test database
 *
 * IMPORTANT: This process does NOT share memory with test workers.
 * Its only job is to run migrations. After migrations, it destroys the
 * DataSource so the connection pool is released before test workers spawn.
 */
import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  process.env['NODE_ENV'] = 'test';
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

  // Dynamic import so env.ts sees the correct process.env above
  const { AppDataSource } = await import('../src/config/database');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('[globalSetup] Test database initialized');
  }

  await AppDataSource.runMigrations();
  console.log('[globalSetup] Migrations applied to test database');

  // Release pool before test workers spawn (each worker re-connects)
  await AppDataSource.destroy();
  console.log('[globalSetup] Connection pool released');
}
