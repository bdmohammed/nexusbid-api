import request from 'supertest';
import { app } from '../../src/config/app';
import { appDataSource } from '../../src/config/database';
import { User } from '../../src/entities/User';
import { UserDevice } from '../../src/entities/UserDevice';
import { PasswordHistory } from '../../src/entities/PasswordHistory';
import { clearAuthTables } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createVerifiedUser } from '../helpers/builders';

// Mock Email Service
jest.mock('../../src/services/email.service');
import {
  sendEmailChangeVerificationEmail,
  sendEmailChangeAlertEmail,
  sendLoginNotificationEmail,
} from '../../src/services/email.service';

const mockSendEmailChangeVerification = sendEmailChangeVerificationEmail as jest.MockedFunction<
  typeof sendEmailChangeVerificationEmail
>;
const mockSendEmailChangeAlert = sendEmailChangeAlertEmail as jest.MockedFunction<
  typeof sendEmailChangeAlertEmail
>;
const mockSendLoginNotification = sendLoginNotificationEmail as jest.MockedFunction<
  typeof sendLoginNotificationEmail
>;

const userRepo = () => appDataSource.getRepository(User);
const deviceRepo = () => appDataSource.getRepository(UserDevice);

describe('Security Backlog Integration Tests', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    mockSendEmailChangeVerification.mockClear();
    mockSendEmailChangeAlert.mockClear();
    mockSendLoginNotification.mockClear();
    await clearAuthTables();
    agent = request.agent(app);
  });

  // =============================================================================
  // 1. CAPTCHA on Failed Logins
  // =============================================================================
  describe('CAPTCHA on Failed Logins', () => {
    it('forces CAPTCHA verification after 3 failed login attempts', async () => {
      const { user } = await createVerifiedUser({ email: 'captcha@test.local' });
      const csrf = await getCsrf(agent);

      // 1. Fail to login 3 times
      for (let i = 0; i < 3; i++) {
        await agent
          .post('/api/v1/auth/login')
          .set('x-csrf-token', csrf.token)
          .send({ email: user.email, password: 'WrongPassword1!' })
          .expect(401);
      }

      // 2. 4th attempt without CAPTCHA token should be rejected
      const res = await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password: 'WrongPassword1!' })
        .expect(400);

      expect(res.body.code).toBe('CAPTCHA_REQUIRED');

      // 3. 4th attempt with CAPTCHA token should bypass CAPTCHA (skips/succeeds in test env)
      const successRes = await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password: 'WrongPassword1!', captchaToken: 'valid-test-token' })
        .expect(401); // Still returns 401 because password is wrong, but captcha is validated and doesn't block!

      expect(successRes.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  // =============================================================================
  // 2. Suspicious Login & Trusted Devices
  // =============================================================================
  describe('Suspicious Login & Trusted Devices', () => {
    it('detects suspicious login and manages trusted devices', async () => {
      const { user, password } = await createVerifiedUser({ email: 'suspicious@test.local' });
      const csrf = await getCsrf(agent);

      // 1. First login (establishes initial known device, not suspicious)
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .set('User-Agent', 'Mozilla/TestBrowser1')
        .send({ email: user.email, password })
        .expect(200);

      expect(mockSendLoginNotification).not.toHaveBeenCalled();

      // Clear agent cookies to start fresh session
      agent = request.agent(app);
      const csrf2 = await getCsrf(agent);

      // 2. Second login with new user-agent (suspicious login alert)
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf2.token)
        .set('User-Agent', 'Mozilla/SuspiciousDevice')
        .send({ email: user.email, password })
        .expect(200);

      expect(mockSendLoginNotification).toHaveBeenCalledTimes(1);
      expect(mockSendLoginNotification).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email, userAgent: 'Mozilla/SuspiciousDevice' }),
      );

      // 3. Get user devices list
      const devicesRes = await agent.get('/api/v1/auth/devices').expect(200);
      expect(devicesRes.body.data.length).toBe(2);

      const untrustedDevice = devicesRes.body.data.find(
        (d: any) => d.userAgent === 'Mozilla/SuspiciousDevice',
      );
      expect(untrustedDevice).toBeDefined();
      expect(untrustedDevice.isTrusted).toBe(false);

      // 4. Mark device as trusted
      const trustCsrf = await getCsrf(agent);
      await agent
        .post(`/api/v1/auth/devices/${untrustedDevice.id}/trust`)
        .set('x-csrf-token', trustCsrf.token)
        .expect(200);

      const devicesRes2 = await agent.get('/api/v1/auth/devices').expect(200);
      const trustedDevice = devicesRes2.body.data.find((d: any) => d.id === untrustedDevice.id);
      expect(trustedDevice.isTrusted).toBe(true);

      // 5. Revoke/delete device
      const revokeCsrf = await getCsrf(agent);
      await agent
        .delete(`/api/v1/auth/devices/${untrustedDevice.id}`)
        .set('x-csrf-token', revokeCsrf.token)
        .expect(200);

      const devicesRes3 = await agent.get('/api/v1/auth/devices').expect(200);
      expect(devicesRes3.body.data.length).toBe(1);
    });
  });

  // =============================================================================
  // 3. Password History (Prevent Reuse)
  // =============================================================================
  describe('Password History & Reuse Prevention', () => {
    it('prevents reuse of the last 5 passwords', async () => {
      const { user, password } = await createVerifiedUser({ email: 'history@test.local' });
      const csrf = await getCsrf(agent);

      // Log in
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password })
        .expect(200);

      // Try changing password to the same password (should fail)
      const changeCsrf = await getCsrf(agent);
      const reuseRes = await agent
        .post('/api/v1/auth/password/change')
        .set('x-csrf-token', changeCsrf.token)
        .send({ currentPassword: password, newPassword: password })
        .expect(400);

      expect(reuseRes.body.code).toBe('PASSWORD_REUSED');

      // Change password 5 times to different passwords
      const passwords = ['PassOne1!', 'PassTwo2!', 'PassThree3!', 'PassFour4!', 'PassFive5!'];
      let currentPw = password;

      for (const nextPw of passwords) {
        const iterationCsrf = await getCsrf(agent);
        await agent
          .post('/api/v1/auth/password/change')
          .set('x-csrf-token', iterationCsrf.token)
          .send({ currentPassword: currentPw, newPassword: nextPw })
          .expect(200);

        // Logging back in to get new cookies since changePassword logs out current client
        agent = request.agent(app);
        const loginCsrf = await getCsrf(agent);
        await agent
          .post('/api/v1/auth/login')
          .set('x-csrf-token', loginCsrf.token)
          .send({ email: user.email, password: nextPw })
          .expect(200);

        currentPw = nextPw;
      }

      // Try changing to the original password (should succeed now because history only holds 5)
      const finalCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/password/change')
        .set('x-csrf-token', finalCsrf.token)
        .send({ currentPassword: currentPw, newPassword: password })
        .expect(200);
    });
  });

  // =============================================================================
  // 4. Password Expiration Guard
  // =============================================================================
  describe('Password Expiration Guard', () => {
    it('blocks access to protected APIs if password is older than 90 days', async () => {
      const { user, password } = await createVerifiedUser({ email: 'expired@test.local' });
      const csrf = await getCsrf(agent);

      // Force password expiration in database (set passwordChangedAt to 91 days ago)
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);
      await userRepo().update(user.id, { passwordChangedAt: ninetyOneDaysAgo });

      // Log in
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password })
        .expect(200);

      // Accessing protected route /me should fail with PASSWORD_EXPIRED
      const res = await agent.get('/api/v1/auth/me').expect(403);
      expect(res.body.code).toBe('PASSWORD_EXPIRED');

      // Password change endpoint should bypass the expiration guard and succeed
      const changeCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/password/change')
        .set('x-csrf-token', changeCsrf.token)
        .send({ currentPassword: password, newPassword: 'NewSecurePass1!' })
        .expect(200);

      // Log back in with new password
      agent = request.agent(app);
      const loginCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', loginCsrf.token)
        .send({ email: user.email, password: 'NewSecurePass1!' })
        .expect(200);

      // /me should work now
      await agent.get('/api/v1/auth/me').expect(200);
    });
  });

  // =============================================================================
  // 5. Forced Password Reset
  // =============================================================================
  describe('Forced Password Reset Guard', () => {
    it('blocks access to protected APIs if mustResetPassword is true', async () => {
      const { user, password } = await createVerifiedUser({ email: 'forced@test.local' });
      const csrf = await getCsrf(agent);

      // Set mustResetPassword to true in database
      await userRepo().update(user.id, { mustResetPassword: true });

      // Log in
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password })
        .expect(200);

      // Accessing protected route /me should fail with FORCED_PASSWORD_RESET
      const res = await agent.get('/api/v1/auth/me').expect(403);
      expect(res.body.code).toBe('FORCED_PASSWORD_RESET');

      // Password change should succeed
      const changeCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/password/change')
        .set('x-csrf-token', changeCsrf.token)
        .send({ currentPassword: password, newPassword: 'NewSecurePass2!' })
        .expect(200);

      // Log back in with new password
      agent = request.agent(app);
      const loginCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', loginCsrf.token)
        .send({ email: user.email, password: 'NewSecurePass2!' })
        .expect(200);

      // /me should work now
      await agent.get('/api/v1/auth/me').expect(200);
    });
  });

  // =============================================================================
  // 6. Email Change Flow
  // =============================================================================
  describe('Email Change Flow', () => {
    it('verifies new email address before updating and triggers notifications', async () => {
      const { user, password } = await createVerifiedUser({ email: 'emailchange@test.local' });
      const csrf = await getCsrf(agent);

      // Log in
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password })
        .expect(200);

      // Request email change
      const changeCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/email/change')
        .set('x-csrf-token', changeCsrf.token)
        .send({ email: 'newemail@test.local' })
        .expect(200);

      // Assert database pending email state
      const dbUser = await userRepo().findOneBy({ id: user.id });
      expect(dbUser!.pendingEmail).toBe('newemail@test.local');

      // Assert verification and alert email calls
      expect(mockSendEmailChangeVerification).toHaveBeenCalledTimes(1);
      expect(mockSendEmailChangeAlert).toHaveBeenCalledTimes(1);

      const verificationToken = mockSendEmailChangeVerification.mock.calls[0][0].token;

      // Verify email change using the token
      const verifyCsrf = await getCsrf(agent);
      await agent
        .post('/api/v1/auth/email/change/verify')
        .set('x-csrf-token', verifyCsrf.token)
        .send({ token: verificationToken })
        .expect(200);

      // Assert email is updated and pendingEmail cleared in DB
      const dbUserAfter = await userRepo().findOneBy({ id: user.id });
      expect(dbUserAfter!.email).toBe('newemail@test.local');
      expect(dbUserAfter!.pendingEmail).toBeNull();

      // Current agent's session is revoked, so accessing /me should return 401
      await agent.get('/api/v1/auth/me').expect(401);
    });
  });
});
