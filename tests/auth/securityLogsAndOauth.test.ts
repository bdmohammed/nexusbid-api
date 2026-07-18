import request from 'supertest';
import { app } from '../../src/config/app';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/database/entities/User';
import { SecurityLog } from '../../src/database/entities/SecurityLog';
import { clearAuthTables } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createVerifiedUser } from '../helpers/builders';

// Mock Email Service
jest.mock('../../src/services/email.service');

const userRepo = () => AppDataSource.getRepository(User);
const securityLogRepo = () => AppDataSource.getRepository(SecurityLog);

// Helper to wait for async geolocation / logging promises to settle
const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Security Logs & OAuth Integration Tests', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    await clearAuthTables();
    agent = request.agent(app);
  });

  // =============================================================================
  // 1. Security Event History & Geolocation Lookup
  // =============================================================================
  describe('Security Log Generation', () => {
    it('creates security log events for registration and login', async () => {
      const csrf = await getCsrf(agent);

      // 1. Register a user
      await agent
        .post('/api/v1/auth/register')
        .set('x-csrf-token', csrf.token)
        .set('User-Agent', 'Mozilla/TestAgent')
        .send({
          name: 'Security Logger User',
          email: 'loggertest@test.local',
          password: 'Password1!',
          companyName: 'Test Inc',
          country: 'US',
        })
        .expect(201);

      await wait(150);

      // Verify register log exists
      const regLog = await securityLogRepo().findOneBy({ event: 'register.success' });
      expect(regLog).toBeDefined();
      expect(regLog!.email).toBe('loggertest@test.local');
      expect(regLog!.location).toBe('Localhost'); // Loopback IP resolves to Localhost
      expect(regLog!.userAgent).toBe('Mozilla/TestAgent');

      // Verify emailChangedAt is null initially
      const user = await userRepo().findOneBy({ email: 'loggertest@test.local' });
      expect(user!.emailChangedAt).toBeNull();

      // Verify register.success logged userId correctly
      expect(regLog!.userId).toBe(user!.id);

      // 2. Successful Login
      // First verify email in DB since verification email token is sent
      await userRepo().update(user!.id, { emailVerified: true });

      const csrf2 = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf2.token)
        .set('User-Agent', 'Mozilla/LoginAgent')
        .send({
          email: 'loggertest@test.local',
          password: 'Password1!',
        })
        .expect(200);

      await wait(150);

      const loginLog = await securityLogRepo().findOneBy({ event: 'login.success' });
      expect(loginLog).toBeDefined();
      expect(loginLog!.userId).toBe(user!.id);
      expect(loginLog!.userAgent).toBe('Mozilla/LoginAgent');
      expect(loginLog!.location).toBe('Localhost');
    });

    it('creates security log events for failed login and lockout events', async () => {
      const { user } = await createVerifiedUser({ email: 'failedlogtest@test.local' });
      const csrf = await getCsrf(agent);

      // Fail login (user exists, password incorrect)
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .set('User-Agent', 'Mozilla/FailedAgent')
        .send({
          email: user.email,
          password: 'WrongPassword!',
        })
        .expect(401);

      await wait(150);

      const failedLog = await securityLogRepo().findOne({
        where: { event: 'login.failed', email: user.email },
      });
      expect(failedLog).toBeDefined();
      expect(failedLog!.userId).toBe(user.id);
      expect(failedLog!.details!.reason).toContain('Incorrect password');

      // Fail login (user does not exist)
      const csrf2 = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf2.token)
        .set('User-Agent', 'Mozilla/NonExistent')
        .send({
          email: 'nonexistent@test.local',
          password: 'SomePassword1!',
        })
        .expect(401);

      await wait(150);

      const nonExistentLog = await securityLogRepo().findOne({
        where: { event: 'login.failed', email: 'nonexistent@test.local' },
      });
      expect(nonExistentLog).toBeDefined();
      expect(nonExistentLog!.userId).toBeNull();
      expect(nonExistentLog!.details!.reason).toContain('User not found');
    });

    it('logs logout events correctly', async () => {
      const { user, password } = await createVerifiedUser({ email: 'logouttest@test.local' });
      const csrf = await getCsrf(agent);

      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .set('User-Agent', 'Mozilla/LogoutAgent')
        .send({ email: user.email, password })
        .expect(200);

      // Log out
      const csrf2 = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/logout')
        .set('x-csrf-token', csrf2.token)
        .set('User-Agent', 'Mozilla/LogoutAgent')
        .expect(200);

      await wait(150);

      const logoutLog = await securityLogRepo().findOneBy({ event: 'logout' });
      expect(logoutLog).toBeDefined();
      expect(logoutLog!.userId).toBe(user.id);
      expect(logoutLog!.userAgent).toBe('Mozilla/LogoutAgent');
    });

    it('logs password changes and email change events', async () => {
      const { user, password } = await createVerifiedUser({ email: 'pwchange@test.local' });
      const csrf = await getCsrf(agent);

      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password })
        .expect(200);

      // 1. Password change
      const csrf2 = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/password/change')
        .set('x-csrf-token', csrf2.token)
        .set('User-Agent', 'Mozilla/ChangeAgent')
        .send({
          currentPassword: password,
          newPassword: 'BrandNewSecurePw2!',
        })
        .expect(200);

      await wait(150);

      const pwLog = await securityLogRepo().findOneBy({ event: 'password.change' });
      expect(pwLog).toBeDefined();
      expect(pwLog!.userId).toBe(user.id);
      expect(pwLog!.userAgent).toBe('Mozilla/ChangeAgent');

      // Log back in to get new cookies
      agent = request.agent(app);
      const csrf3 = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf3.token)
        .send({ email: user.email, password: 'BrandNewSecurePw2!' })
        .expect(200);

      // 2. Request Email change
      const csrf4 = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/email/change')
        .set('x-csrf-token', csrf4.token)
        .set('User-Agent', 'Mozilla/EmailRequest')
        .send({ email: 'newemailchange@test.local' })
        .expect(200);

      await wait(150);

      const emailRequestLog = await securityLogRepo().findOneBy({ event: 'email.change.request' });
      expect(emailRequestLog).toBeDefined();
      expect(emailRequestLog!.userId).toBe(user.id);
      expect(emailRequestLog!.details!.newEmail).toBe('newemailchange@test.local');
    });
  });

  // =============================================================================
  // 2. OAuth Authentication (Google, GitHub, Microsoft)
  // =============================================================================
  describe('OAuth Authentication Flows', () => {
    it('redirects to the provider endpoint correctly', async () => {
      const res = await agent.get('/api/v1/auth/oauth/google').expect(302);
      expect(res.headers.location).toContain('accounts.google.com');
      expect(res.headers.location).toContain('openid+email+profile');
      expect(res.headers['set-cookie'][0]).toContain('oauth_state');
    });

    it('performs auto-registration on first callback login and logs success', async () => {
      // Mock code handles mock login verification in local/test environment
      await agent
        .get('/api/v1/auth/oauth/google/callback?code=mock_code_google_user&state=test_state')
        .expect(302)
        .expect('Location', 'http://localhost:4000'); // default frontend url (from env setup)

      await wait(150);

      // Verify user was registered
      const oauthUser = await userRepo().findOneBy({ email: 'mock.google@example.com' });
      expect(oauthUser).toBeDefined();
      expect(oauthUser!.googleId).toBeDefined();
      expect(oauthUser!.googleId).toContain('google-mock-');
      expect(oauthUser!.emailVerified).toBe(true);

      // Verify register & login security events were logged
      const regLog = await securityLogRepo().findOneBy({ event: 'register.success' });
      expect(regLog).toBeDefined();
      expect(regLog!.userId).toBe(oauthUser!.id);
      expect(regLog!.details!.method).toBe('oauth_google');

      const loginLog = await securityLogRepo().findOneBy({ event: 'login.success' });
      expect(loginLog).toBeDefined();
      expect(loginLog!.userId).toBe(oauthUser!.id);
      expect(loginLog!.details!.method).toBe('oauth_google');
    });

    it('performs auto-linking when OAuth email matches an existing email', async () => {
      // Create user registered via standard credentials
      const { user } = await createVerifiedUser({ email: 'mock.github@example.com' });
      expect(user.githubId).toBeNull();

      // Trigger GitHub callback login with same email
      await agent
        .get('/api/v1/auth/oauth/github/callback?code=mock_code_github_user&state=test_state')
        .expect(302);

      await wait(150);

      // Verify user has now linked GitHub ID
      const linkedUser = await userRepo().findOneBy({ id: user.id });
      expect(linkedUser!.githubId).toBeDefined();
      expect(linkedUser!.githubId).toContain('github-mock-');

      // Verify login success log with linked method
      const loginLog = await securityLogRepo().findOneBy({ event: 'login.success' });
      expect(loginLog).toBeDefined();
      expect(loginLog!.userId).toBe(user.id);
      expect(loginLog!.details!.action).toBe('linked');
    });
  });
});
