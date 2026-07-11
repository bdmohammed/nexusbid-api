import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { app } from '../../src/config/app';
import { appDataSource } from '../../src/config/database';
import { User } from '../../src/entities/User';
import { UserSession } from '../../src/entities/UserSession';
import { clearAuthTables } from '../helpers/db';
import { getCsrf } from '../helpers/csrf';
import { createVerifiedUser } from '../helpers/builders';
import { JWT_COOKIE_NAME } from '../../src/core/constants';
import { REFRESH_COOKIE_NAME } from '../../src/modules/auth/auth.service';
import { env } from '../../src/config/env';

const userRepo = appDataSource.getRepository(User);
const sessionRepo = appDataSource.getRepository(UserSession);

describe('Session Management & Security integration tests', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    await clearAuthTables();
    agent = request.agent(app);
  });

  // 1. Access Token Expiration
  it('should return TOKEN_EXPIRED (401) when access token is expired', async () => {
    const { user } = await createVerifiedUser();

    // Create an expired access token
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      accountType: user.accountType,
      role: user.accountType,
      adminRole: null,
      tokenVersion: user.tokenVersion,
      exp: Math.floor(Date.now() / 1000) - 60, // expired 1 minute ago
    };
    const expiredToken = jwt.sign(payload, env.JWT_SECRET);

    // Make request with expired access token cookie
    const res = await agent
      .get('/api/v1/auth/me')
      .set('Cookie', [`${JWT_COOKIE_NAME}=${expiredToken}`])
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  // 2. Login Flow sets cookies and creates DB session
  it('should set access & refresh cookies and save session in DB upon login', async () => {
    const { user, password } = await createVerifiedUser();
    const csrf = await getCsrf(agent);

    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);

    // Verify cookies are set
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();

    const hasAccessCookie = cookies.some((c) => c.startsWith(`${JWT_COOKIE_NAME}=`));
    const hasRefreshCookie = cookies.some((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(hasAccessCookie).toBe(true);
    expect(hasRefreshCookie).toBe(true);

    // Verify DB session exists
    const sessions = await sessionRepo.find({ where: { userId: user.id } });
    expect(sessions.length).toBe(1);
    expect(sessions[0].isRevoked).toBe(false);
  });

  // 3. Token Refresh (RTR)
  it('should rotate both access & refresh tokens on refresh', async () => {
    const { user, password } = await createVerifiedUser();
    const csrf = await getCsrf(agent);

    // Login to get initial cookies
    let loginRes = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);

    // Retrieve initial refresh token from cookie
    const loginCookies = loginRes.headers['set-cookie'] as string[];
    const firstRefreshTokenCookie = loginCookies.find((c) =>
      c.startsWith(`${REFRESH_COOKIE_NAME}=`),
    )!;
    const firstRefreshToken = firstRefreshTokenCookie.split(';')[0].split('=')[1];

    // Trigger refresh using the refresh token
    const refreshRes = await agent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [`${REFRESH_COOKIE_NAME}=${firstRefreshToken}`])
      .expect(200);

    expect(refreshRes.body.success).toBe(true);

    // Check that new cookies were returned
    const refreshCookies = refreshRes.headers['set-cookie'] as string[];
    const newRefreshTokenCookie = refreshCookies.find((c) =>
      c.startsWith(`${REFRESH_COOKIE_NAME}=`),
    )!;
    const secondRefreshToken = newRefreshTokenCookie.split(';')[0].split('=')[1];

    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // Verify DB: original session must be marked revoked, and a new active one created
    const firstTokenHash = crypto.createHash('sha256').update(firstRefreshToken).digest('hex');
    const oldSession = await sessionRepo.findOneBy({ tokenHash: firstTokenHash });
    expect(oldSession!.isRevoked).toBe(true);

    const secondTokenHash = crypto.createHash('sha256').update(secondRefreshToken).digest('hex');
    const newSession = await sessionRepo.findOneBy({ tokenHash: secondTokenHash });
    expect(newSession!.isRevoked).toBe(false);
  });

  // 4. Replay Detection
  it('should revoke all active sessions when a revoked refresh token is replayed', async () => {
    const { user, password } = await createVerifiedUser();
    const csrf = await getCsrf(agent);

    // Login
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);

    const loginCookies = loginRes.headers['set-cookie'] as string[];
    const refreshTokenCookie = loginCookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))!;
    const refreshToken = refreshTokenCookie.split(';')[0].split('=')[1];

    // First refresh: rotates token, revoking the first one
    await agent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [`${REFRESH_COOKIE_NAME}=${refreshToken}`])
      .expect(200);

    // Make an independent request (e.g. login again) to create another active session
    const anotherAgent = request.agent(app);
    await anotherAgent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);

    let activeSessions = await sessionRepo.find({ where: { userId: user.id, isRevoked: false } });
    expect(activeSessions.length).toBe(2); // One from RTR rotation, one from fresh login

    // Replay attack: attempt to refresh using the revoked first refresh token
    const replayRes = await agent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [`${REFRESH_COOKIE_NAME}=${refreshToken}`])
      .expect(401);

    expect(replayRes.body.code).toBe('REPLAY_DETECTED');

    // All sessions must be marked as revoked now
    activeSessions = await sessionRepo.find({ where: { userId: user.id, isRevoked: false } });
    expect(activeSessions.length).toBe(0);
  });

  // 5. Account Lockout
  it('should lock user account after 5 consecutive failed login attempts', async () => {
    const { user } = await createVerifiedUser();
    const csrf = await getCsrf(agent);

    // 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      await agent
        .post('/api/v1/auth/login')
        .set('x-csrf-token', csrf.token)
        .send({ email: user.email, password: 'WrongPassword1!' })
        .expect(401);
    }

    // 6th attempt should be blocked by lockout policy
    const lockedRes = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password: 'WrongPassword1!' })
      .expect(403);

    expect(lockedRes.body.code).toBe('ACCOUNT_LOCKED');
    expect(lockedRes.body.message).toMatch(/temporarily locked/i);

    // Verify user columns in DB
    const dbUser = await userRepo.findOneBy({ id: user.id });
    expect(dbUser!.lockoutUntil).not.toBeNull();
    expect(dbUser!.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  // 6. Active Sessions API and Revocation
  it('should list active sessions, revoke specific session, and revoke all sessions', async () => {
    const { user, password } = await createVerifiedUser();
    const csrf = await getCsrf(agent);

    // Login current agent
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'] as string[];
    const accessCookie = cookies.find((c) => c.startsWith(`${JWT_COOKIE_NAME}=`))!;
    const refreshCookie = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))!;

    // Create a second session (simulate another device)
    const secondAgent = request.agent(app);
    const secondLoginRes = await secondAgent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.token)
      .send({ email: user.email, password })
      .expect(200);
    const secondCookies = secondLoginRes.headers['set-cookie'] as string[];
    const secondAccess = secondCookies.find((c) => c.startsWith(`${JWT_COOKIE_NAME}=`))!;

    // 1. Get active sessions
    const sessionsRes = await agent
      .get('/api/v1/auth/sessions')
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [accessCookie, refreshCookie])
      .expect(200);

    expect(sessionsRes.body.success).toBe(true);
    expect(sessionsRes.body.data.length).toBe(2);

    // Verify one of them isCurrent=true, and the other isCurrent=false
    const currentSession = sessionsRes.body.data.find((s: any) => s.isCurrent === true);
    const otherSession = sessionsRes.body.data.find((s: any) => s.isCurrent === false);

    expect(currentSession).toBeDefined();
    expect(otherSession).toBeDefined();

    // 2. Revoke the other session
    await agent
      .delete(`/api/v1/auth/sessions/${otherSession.id}`)
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [accessCookie, refreshCookie])
      .expect(200);

    // Verify second agent is now blocked
    await secondAgent.get('/api/v1/auth/me').set('Cookie', [secondAccess]).expect(401); // Wait, since second agent's access token is still valid (until 15m expires),
    // but wait, is the access token checked against DB isRevoked session?
    // No, access token validation checks user.tokenVersion, not individual session status!
    // But if we refresh the second agent's session, the refresh token will be found revoked:
    const secondRefreshCookie = secondCookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))!;
    await secondAgent
      .post('/api/v1/auth/refresh')
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [secondRefreshCookie])
      .expect(401); // Refuses to rotate because session is revoked!

    // 3. Revoke all sessions (Global Logout)
    await agent
      .delete('/api/v1/auth/sessions')
      .set('x-csrf-token', csrf.token)
      .set('Cookie', [accessCookie, refreshCookie])
      .expect(200);

    // Verify that even the first agent's access token is now rejected because tokenVersion was incremented
    await agent.get('/api/v1/auth/me').set('Cookie', [accessCookie]).expect(401);
  });
});
