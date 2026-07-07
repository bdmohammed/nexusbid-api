/**
 * tests/helpers/builders.ts
 *
 * Test data builders (Issue #14).
 *
 * Why builders instead of hardcoded objects?
 *   - Tests that only care about one field (e.g., isBlocked=true) should not
 *     have to specify every required column.
 *   - Builders provide sensible defaults and accept partial overrides, keeping
 *     tests focused and readable.
 *   - createVerifiedUser() returns both the User entity and the plain-text
 *     password so login tests can use it directly without knowing bcrypt details.
 *
 * Pattern:
 *   buildUser()          -- in-memory Partial<User> (no DB)
 *   createUser()         -- persists to DB, returns User entity (unverified)
 *   createVerifiedUser() -- persists + sets emailVerified=true, returns { user, password }
 */
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/entities/User';
import { AccountType } from '../../src/types/enums';
import { BCRYPT_ROUNDS } from '../../src/core/constants';

const userRepo = AppDataSource.getRepository(User);

let counter = 0;

function uniqueEmail(): string {
  return `test-user-${Date.now()}-${++counter}@nexusbid-test.local`;
}

/**
 * Returns a plain object with default User field values.
 * Merge with overrides to create scenario-specific test data.
 */
export function buildUser(overrides: Partial<User> & { password?: string } = {}): {
  name: string;
  email: string;
  passwordHash: string;
  accountType: AccountType;
  companyName: string | null;
  country: string | null;
  emailVerified: boolean;
  isBlocked: boolean;
  tokenVersion: number;
} {
  const { password: _password, ...rest } = overrides;
  return {
    name: 'Test User',
    email: uniqueEmail(),
    passwordHash: '$2b$10$placeholder.hash.only.use.createUser', // never compare directly
    accountType: AccountType.USER,
    companyName: null,
    country: null,
    emailVerified: false,
    isBlocked: false,
    tokenVersion: 1,
    ...rest,
  };
}

/**
 * Creates and persists a User in the test database.
 * Password is bcrypt-hashed automatically.
 * Returns the saved User entity.
 */
export async function createUser(
  overrides: Partial<User> & { password?: string } = {},
): Promise<User> {
  const password = overrides.password ?? 'TestPass1!';
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS.PASSWORD);

  const { password: _drop, ...fieldOverrides } = overrides;
  const data = buildUser({ ...fieldOverrides, passwordHash });

  const user = userRepo.create(data as Partial<User>);
  return userRepo.save(user);
}

/**
 * Creates a User with emailVerified=true.
 * Returns both the entity and the plain-text password for login tests.
 */
export async function createVerifiedUser(
  overrides: Partial<User> & { password?: string } = {},
): Promise<{ user: User; password: string }> {
  const password = overrides.password ?? 'TestPass1!';
  const user = await createUser({ ...overrides, password, emailVerified: true });
  return { user, password };
}
