/**
 * tests/auth/auth.test.ts
 *
 * Integration tests for the auth module.
 * All 15 issues from the implementation plan are addressed here.
 *
 * Architecture:
 *   - One supertest agent per describe block (cookie-jar isolation)
 *   - Real CSRF flow via GET /csrf-token (no app.ts bypass)
 *   - Email service fully mocked via jest.mock()
 *   - Tables truncated with CASCADE between tests
 *   - Fake timers for TTL expiry tests
 *   - tokenVersion-based revocation tested end-to-end
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/config/app';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/entities/User';
import { JWT_COOKIE_NAME, EMAIL_TOKEN_TTL } from '../../src/core/constants';
import { clearAuthTables } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createUser, createVerifiedUser } from '../helpers/builders';
import { withFakeTime } from '../helpers/time';

// â”€â”€ Mock the email service (Issue #6, #2 from plan) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// jest.mock auto-replaces all exports with jest.fn() spies.
// No real Resend API calls in test env.
jest.mock('../../src/services/email.service');

// Typed references to the mocked functions
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../src/services/email.service';

const mockSendVerificationEmail = sendVerificationEmail as jest.MockedFunction<typeof sendVerificationEmail>;
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>;

// â”€â”€ Repositories (direct DB access for test assertions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const userRepo = () => AppDataSource.getRepository(User);

// â”€â”€ Valid registration payload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VALID_REGISTER = {
  name: 'Jane Doe',
  email: 'jane@example-test.com',
  password: 'SecurePass1!',
};

// =============================================================================
// 1. POST /api/v1/auth/register
// =============================================================================
describe('POST /api/v1/auth/register', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    // Issue #6: explicit mockClear in addition to global beforeEach clearAllMocks
    mockSendVerificationEmail.mockClear();
    mockSendPasswordResetEmail.mockClear();
    mockSendVerificationEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  it('201 + sends verification email for valid payload', async () => {
    const csrf = await getCsrf(agent);

    const res = await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', csrf.token)
      .send(VALID_REGISTER)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verify your email/i);

    // Email must have been called exactly once
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: VALID_REGISTER.email }),
    );

    // User must exist in DB and be unverified
    const user = await userRepo().findOneBy({ email: VALID_REGISTER.email });
    expect(user).not.toBeNull();
    expect(user!.emailVerified).toBe(false);
  });

  it('409 on duplicate email', async () => {
    await createUser({ email: VALID_REGISTER.email });
    const csrf = await getCsrf(agent);

    const res = await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', csrf.token)
      .send(VALID_REGISTER)
      .expect(409);

    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('422 on password missing uppercase', async () => {
    const csrf = await getCsrf(agent);

    const res = await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', csrf.token)
      .send({ ...VALID_REGISTER, password: 'nouppercase1' })
      .expect(422);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('422 on invalid email format', async () => {
    const csrf = await getCsrf(agent);

    const res = await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', csrf.token)
      .send({ ...VALID_REGISTER, email: 'not-an-email' })
      .expect(422);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('403 CSRF_INVALID when x-csrf-token header is missing', async () => {
    const res = await agent
      .post('/api/v1/auth/register')
      .send(VALID_REGISTER)
      .expect(403);

    expect(res.body.code).toBe('CSRF_INVALID');
  });
});

// =============================================================================
// 2. POST /api/v1/auth/verify-email
// =============================================================================
describe('POST /api/v1/auth/verify-email', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendVerificationEmail.mockClear();
    mockSendVerificationEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  async function registerAndGetToken(): Promise<{ email: string; rawToken: string }> {
    const csrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', csrf.token)
      .send(VALID_REGISTER)
      .expect(201);

    // Extract the raw token from the mock call
    const rawToken: string = mockSendVerificationEmail.mock.calls[0][0].token;
    return { email: VALID_REGISTER.email, rawToken };
  }

  it('200 on valid token and sets emailVerified=true in DB', async () => {
    const { email, rawToken } = await registerAndGetToken();

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/verify-email')
      .set('x-csrf-token', csrf.token)
      .send({ token: rawToken })
      .expect(200);

    expect(res.body.success).toBe(true);

    const user = await userRepo().findOneBy({ email });
    expect(user!.emailVerified).toBe(true);
  });

  it('400 on invalid / random token', async () => {
    const csrf = await getCsrf(agent);

    const res = await agent
      .post('/api/v1/auth/verify-email')
      .set('x-csrf-token', csrf.token)
      .send({ token: 'completely-wrong-token-value' })
      .expect(400);

    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('400 on expired token (past 24h TTL)', async () => {
    const { rawToken } = await registerAndGetToken();

    await withFakeTime(EMAIL_TOKEN_TTL.VERIFICATION + 60_000, async () => {
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/verify-email')
        .set('x-csrf-token', csrf.token)
        .send({ token: rawToken })
        .expect(400);

      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  it('400 on already-used token', async () => {
    const { rawToken } = await registerAndGetToken();

    // First use -- should succeed
    const csrf1 = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/verify-email')
      .set('x-csrf-token', csrf1.token)
      .send({ token: rawToken })
      .expect(200);

    // Second use -- should fail
    const csrf2 = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/verify-email')
      .set('x-csrf-token', csrf2.token)
      .send({ token: rawToken })
      .expect(400);

    expect(res.body.code).toBe('INVALID_TOKEN');
  });
});

// =============================================================================
// 3. POST /api/v1/auth/login
// =============================================================================
describe('POST /api/v1/auth/login', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendVerificationEmail.mockClear();
    mockSendVerificationEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  it('200 + sets HttpOnly JWT cookie on successful login', async () => {
    const { user, password } = await createVerifiedUser({ email: 'login@test.local' });

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Cookie assertions (Issue #10)
    const rawCookies = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    expect(cookies).toBeDefined();
    const jwtCookie = cookies.find((c) => c.startsWith(JWT_COOKIE_NAME));
    expect(jwtCookie).toBeDefined();
    expect(jwtCookie).toMatch(/HttpOnly/i);
    expect(jwtCookie).toMatch(/SameSite=Lax/i);

    // Profile must not leak sensitive fields
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('tokenVersion');
    expect(res.body.data.email).toBe(user.email);
  });

  it('401 INVALID_CREDENTIALS on wrong password', async () => {
    const { user } = await createVerifiedUser({ email: 'wrongpw@test.local' });

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password: 'WrongPassword1!' })
      .expect(401);

    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 INVALID_CREDENTIALS on non-existent email (no enumeration)', async () => {
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: 'doesnotexist@test.local', password: 'SomePass1!' })
      .expect(401);

    // Same error code as wrong password -- prevents email enumeration
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('403 EMAIL_NOT_VERIFIED when email is not verified', async () => {
    const user = await createUser({ email: 'unverified@test.local' });

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password: 'TestPass1!' })
      .expect(403);

    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('403 ACCOUNT_BLOCKED when user is blocked', async () => {
    const { user, password } = await createVerifiedUser({
      email: 'blocked@test.local',
      isBlocked: true,
    });

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(403);

    expect(res.body.code).toBe('ACCOUNT_BLOCKED');
  });
});

// =============================================================================
// 4. GET /api/v1/auth/me  (authenticate middleware -- Issue #11)
// =============================================================================
describe('GET /api/v1/auth/me', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendVerificationEmail.mockClear();
    mockSendVerificationEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  async function loginAgent(
    email: string,
    password: string,
  ): Promise<ReturnType<typeof request.agent>> {
    const csrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email, password })
      .expect(200);
    return agent;
  }

  it('401 UNAUTHENTICATED without any cookie', async () => {
    const fresh = request.agent(app);
    const res = await fresh.get('/api/v1/auth/me').expect(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('200 returns user profile (no sensitive fields) with valid cookie', async () => {
    const { user, password } = await createVerifiedUser({ email: 'me@test.local' });
    await loginAgent(user.email, password);

    const res = await agent.get('/api/v1/auth/me').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('tokenVersion');
  });

  it('401 INVALID_TOKEN with a tampered JWT', async () => {
    // Forge a JWT signed with wrong secret
    const fakeToken = jwt.sign(
      { sub: 'fake-id', email: 'x@x.com', accountType: 'user', tokenVersion: 1 },
      'wrong-secret-key',
    );

    const tamperAgent = request.agent(app);
    // Inject the forged token via cookie header
    const res = await tamperAgent
      .get('/api/v1/auth/me')
      .set('Cookie', `${JWT_COOKIE_NAME}=${fakeToken}`)
      .expect(401);

    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('401 SESSION_REVOKED when tokenVersion in JWT does not match DB (Issue #13)', async () => {
    const { user, password } = await createVerifiedUser({ email: 'revoke@test.local' });
    await loginAgent(user.email, password);

    // Simulate tokenVersion increment (e.g., after password reset)
    await AppDataSource.getRepository(User).update(user.id, {
      tokenVersion: user.tokenVersion + 1,
    });

    const res = await agent.get('/api/v1/auth/me').expect(401);
    expect(res.body.code).toBe('SESSION_REVOKED');
  });

  it('403 ACCOUNT_BLOCKED when account is blocked after login', async () => {
    const { user, password } = await createVerifiedUser({ email: 'postblock@test.local' });
    await loginAgent(user.email, password);

    // Admin blocks the account after the JWT was issued
    await AppDataSource.getRepository(User).update(user.id, { isBlocked: true });

    const res = await agent.get('/api/v1/auth/me').expect(403);
    expect(res.body.code).toBe('ACCOUNT_BLOCKED');
  });
});

// =============================================================================
// 5. POST /api/v1/auth/logout
// =============================================================================
describe('POST /api/v1/auth/logout', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendVerificationEmail.mockClear();
    mockSendVerificationEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  it('200 + clears JWT cookie on logout (Issue #10)', async () => {
    const { user, password } = await createVerifiedUser({ email: 'logout@test.local' });

    // Login first
    const loginCsrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', loginCsrf.token)
      .send({ email: user.email, password })
      .expect(200);

    // Logout
    const logoutCsrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', logoutCsrf.token)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Cookie must be cleared: Max-Age=0 or Expires in the past
    const rawCookies = res.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    const cleared = cookies?.find((c) => c.startsWith(JWT_COOKIE_NAME));
    expect(cleared).toBeDefined();
    const isCleared =
      /Max-Age=0/i.test(cleared!) ||
      /Expires=Thu, 01 Jan 1970/i.test(cleared!);
    expect(isCleared).toBe(true);
  });

  it('401 UNAUTHENTICATED when trying to logout without a cookie', async () => {
    const fresh = request.agent(app);
    const csrf = await getCsrf(fresh);
    const res = await fresh
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', csrf.token)
      .expect(401);

    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});

// =============================================================================
// 6. POST /api/v1/auth/forgot-password
// =============================================================================
describe('POST /api/v1/auth/forgot-password', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendPasswordResetEmail.mockClear();
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  it('200 for known email + sends reset email exactly once', async () => {
    const { user } = await createVerifiedUser({ email: 'forgotme@test.local' });

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/forgot-password')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: user.email }),
    );
  });

  it('200 for unknown email -- silent (no email sent, no enumeration)', async () => {
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/forgot-password')
      .set('x-csrf-token', csrf.token)
      .send({ email: 'doesnotexist@test.local' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('422 on invalid email format', async () => {
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/forgot-password')
      .set('x-csrf-token', csrf.token)
      .send({ email: 'not-an-email' })
      .expect(422);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// =============================================================================
// 7. POST /api/v1/auth/reset-password  (Issue #12, #13)
// =============================================================================
describe('POST /api/v1/auth/reset-password', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendVerificationEmail.mockClear();
    mockSendPasswordResetEmail.mockClear();
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    await clearAuthTables();
    agent = request.agent(app);
  });

  async function getResetToken(email: string): Promise<string> {
    const csrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/forgot-password')
      .set('x-csrf-token', csrf.token)
      .send({ email })
      .expect(200);

    return mockSendPasswordResetEmail.mock.calls[0][0].token as string;
  }

  it('200 on valid token + valid new password', async () => {
    const { user } = await createVerifiedUser({ email: 'reset@test.local' });
    const rawToken = await getResetToken(user.email);

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/reset-password')
      .set('x-csrf-token', csrf.token)
      .send({ token: rawToken, password: 'NewSecurePass2!' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('400 INVALID_TOKEN on a random token', async () => {
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/reset-password')
      .set('x-csrf-token', csrf.token)
      .send({ token: 'bad-token-value', password: 'NewSecurePass2!' })
      .expect(400);

    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('400 INVALID_TOKEN on expired token (past 30min TTL) -- Issue #12', async () => {
    const { user } = await createVerifiedUser({ email: 'expiredtoken@test.local' });
    const rawToken = await getResetToken(user.email);

    await withFakeTime(EMAIL_TOKEN_TTL.PASSWORD_RESET + 60_000, async () => {
      const csrf = await getCsrf(agent);
      const res = await agent
        .post('/api/v1/auth/reset-password')
        .set('x-csrf-token', csrf.token)
        .send({ token: rawToken, password: 'NewSecurePass2!' })
        .expect(400);

      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  it('400 INVALID_TOKEN on already-used reset token', async () => {
    const { user } = await createVerifiedUser({ email: 'usedtoken@test.local' });
    const rawToken = await getResetToken(user.email);

    // First use
    const csrf1 = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/reset-password')
      .set('x-csrf-token', csrf1.token)
      .send({ token: rawToken, password: 'NewSecurePass2!' })
      .expect(200);

    // Second use -- token was deleted after first use
    const csrf2 = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/reset-password')
      .set('x-csrf-token', csrf2.token)
      .send({ token: rawToken, password: 'AnotherPass3!' })
      .expect(400);

    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('old JWT cookie is revoked after password reset -- Issue #13 (session revocation)', async () => {
    const { user, password } = await createVerifiedUser({ email: 'sessionrevoke@test.local' });

    // Login to get a JWT cookie
    const loginCsrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', loginCsrf.token)
      .send({ email: user.email, password })
      .expect(200);

    // Confirm /me works before reset
    await agent.get('/api/v1/auth/me').expect(200);

    // Trigger password reset on a FRESH agent (simulating different browser/device)
    const resetAgent = request.agent(app);
    mockSendPasswordResetEmail.mockClear();
    const forgotCsrf = await getCsrf(resetAgent);
    await resetAgent
      .post('/api/v1/auth/forgot-password')
      .set('x-csrf-token', forgotCsrf.token)
      .send({ email: user.email })
      .expect(200);

    const rawToken = mockSendPasswordResetEmail.mock.calls[0][0].token as string;

    const resetCsrf = await getCsrf(resetAgent);
    await resetAgent
      .post('/api/v1/auth/reset-password')
      .set('x-csrf-token', resetCsrf.token)
      .send({ token: rawToken, password: 'BrandNewPass3!' })
      .expect(200);

    // Old agent's JWT must now be rejected (tokenVersion was incremented)
    const res = await agent.get('/api/v1/auth/me').expect(401);
    expect(res.body.code).toBe('SESSION_REVOKED');
  });
});

// =============================================================================
// 8. GET /api/v1/auth/csrf-token + CSRF integration
// =============================================================================
describe('GET /api/v1/auth/csrf-token', () => {
  it('200 + returns csrfToken in body', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/api/v1/auth/csrf-token').expect(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.csrfToken).toBe('string');
    expect(res.body.data.csrfToken.length).toBeGreaterThan(16);
  });

  it('403 CSRF_INVALID on POST /login without x-csrf-token header', async () => {
    const { user } = await createVerifiedUser({ email: 'nocsrf@test.local' });
    const agent = request.agent(app);

    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'TestPass1!' })
      .expect(403);

    expect(res.body.code).toBe('CSRF_INVALID');
  });

  it('201 on POST /register WITH valid x-csrf-token from csrf-token endpoint', async () => {
    await clearAuthTables();
    const agent = request.agent(app);
    mockSendVerificationEmail.mockResolvedValue(undefined);

    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', csrf.token)
      .send({ name: 'CSRF Test', email: 'csrftest@test.local', password: 'SecurePass1!' })
      .expect(201);

    expect(res.body.success).toBe(true);
  });
});




