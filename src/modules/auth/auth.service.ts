import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { MoreThan } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { UserSession } from '../../entities/UserSession';
import { EmailToken } from '../../entities/EmailToken';
import { Role, RoleStatus } from '../../entities/Role';
import { UserRole } from '../../entities/UserRole';
import { RoleVersion, RoleVersionStatus } from '../../entities/RoleVersion';
import { AppError } from '../../core/AppError';
import { BCRYPT_ROUNDS, JWT_COOKIE_NAME } from '../../core/constants';
import { AccountType, EmailTokenType, UserStatus } from '../../types/enums';
import { createEmailToken, verifyAndConsumeToken, getValidTokenDetails } from '../../services/token.service';
import {
  sendVerificationEmail,
  sendAdminVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeVerificationEmail,
  sendEmailChangeAlertEmail,
  sendAdminRegistrationNotification,
  sendAdminApprovalStatusEmail,
  sendAdminBootstrapNotification,
} from '../../services/email.service';
import {
  verifyCaptcha,
  verifyPasswordBreach,
  checkPasswordHistory,
  savePasswordToHistory,
  trackDeviceAndDetectSuspicious,
} from './security.service';
import { logSecurityEvent } from './securityLog.service';
import { UserDevice } from '../../entities/UserDevice';
import { env } from '../../config/env';
import type { JwtPayload } from '../../types/express.d';
import type { RegisterDto, LoginDto } from './auth.dto';
import type { Response } from 'express';

const userRepo = AppDataSource.getRepository(User);
const sessionRepo = AppDataSource.getRepository(UserSession);

export const REFRESH_COOKIE_NAME = 'nexusbid_refresh_token';

// Access token expires in 15 minutes
const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

// Refresh token configuration
const REFRESH_EXPIRY = {
  NORMAL: 7 * 24 * 60 * 60 * 1000, // 7 days
  REMEMBER_ME: 30 * 24 * 60 * 60 * 1000, // 30 days
  ADMIN: 4 * 60 * 60 * 1000, // 4 hours
};

/**
 * Strips sensitive fields from a user object before returning to client.
 */
function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockoutUntil'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, tokenVersion, failedLoginAttempts, lockoutUntil, ...safe } = user;
  return safe;
}

/**
 * Generates and sets access and refresh tokens.
 * Saves the session in the database.
 */
async function generateAndSetTokens(
  res: Response,
  user: User,
  details: { userAgent: string | null; ipAddress: string | null; rememberMe?: boolean }
): Promise<void> {
  const isAdmin = user.accountType === AccountType.ADMIN;

  // 1. Generate Access Token (15 minutes)
  const accessPayload: JwtPayload = {
    sub: user.id,
    userId: user.id,
    email: user.email,
    accountType: user.accountType,
    role: user.accountType,
    adminRole: null,
    tokenVersion: user.tokenVersion,
  };

  const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // 2. Generate Refresh Token (64 random bytes hex)
  const rawRefreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  // Determine TTL
  let refreshTtl = REFRESH_EXPIRY.NORMAL;
  if (isAdmin) {
    refreshTtl = REFRESH_EXPIRY.ADMIN;
  } else if (details.rememberMe) {
    refreshTtl = REFRESH_EXPIRY.REMEMBER_ME;
  }

  const expiresAt = new Date(Date.now() + refreshTtl);

  // 3. Save UserSession in DB
  const session = sessionRepo.create({
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent: details.userAgent,
    ipAddress: details.ipAddress,
  });
  await sessionRepo.save(session);

  // 4. Set Access Token Cookie
  res.cookie(JWT_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat',
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  // 5. Set Refresh Token Cookie (scoped to /api/v1/auth)
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat',
    sameSite: 'lax',
    maxAge: refreshTtl,
    path: '/api/v1/auth',
  });
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export async function registerUser(
  dto: RegisterDto,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const exists = await userRepo.findOne({
    where: { email: dto.email },
    select: ['id'],
  });
  if (exists) {
    throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  // Verify that the password is not leaked/breached
  await verifyPasswordBreach(dto.password);

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

  const user = userRepo.create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    companyName: dto.companyName ?? null,
    country: dto.country ?? null,
    accountType: AccountType.USER,
    status: UserStatus.PENDING_EMAIL_VERIFICATION,
    emailVerified: false,
    passwordChangedAt: new Date(),
  });

  await userRepo.save(user);

  // Save the initial password to history
  await savePasswordToHistory(user.id, passwordHash);

  // Log registration success
  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: 'register.success',
    ipAddress: details?.ipAddress ?? null,
    userAgent: details?.userAgent ?? null,
  });

  const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_VERIFICATION);
  await userRepo.update(userId, { emailVerified: true, status: UserStatus.ACTIVE });
}

export async function resendVerification(
  email: string,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const user = await userRepo.findOne({ where: { email } });

  // Return silently if user does not exist (avoid email enumeration)
  if (!user) {
    return;
  }

  // Return silently if already verified
  if (user.emailVerified) {
    return;
  }

  // Delete any pending verification tokens for this user first
  const tokenRepo = AppDataSource.getRepository(EmailToken);
  await tokenRepo.delete({ userId: user.id, type: EmailTokenType.EMAIL_VERIFICATION });

  // Create a new token and send the email
  const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });

  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: 'resend_verification.success',
    ipAddress: details?.ipAddress ?? null,
    userAgent: details?.userAgent ?? null,
  });
}

export async function loginUser(
  dto: LoginDto & { rememberMe?: boolean; captchaToken?: string },
  res: Response,
  details: { userAgent: string | null; ipAddress: string | null }
): Promise<ReturnType<typeof sanitizeUser>> {
  const GENERIC_ERROR = new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const user = await userRepo.findOne({
    where: { email: dto.email },
  });
  if (!user) {
    await logSecurityEvent({
      email: dto.email,
      event: 'login.failed',
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details: { reason: 'User not found' },
    });
    throw GENERIC_ERROR;
  }

  // 1. Check Lockout Status
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: 'login.failed',
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details: { reason: 'Account locked out' },
    });
    throw new AppError(
      `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      403,
      'ACCOUNT_LOCKED'
    );
  }

  // 1.5. CAPTCHA Check (Enforced if failed attempts >= 3)
  if (user.failedLoginAttempts >= 3) {
    if (!dto.captchaToken) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        event: 'captcha.failed',
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        details: { reason: 'CAPTCHA token missing' },
      });
      throw new AppError('CAPTCHA verification required', 400, 'CAPTCHA_REQUIRED');
    }
    try {
      await verifyCaptcha(dto.captchaToken);
    } catch (err) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        event: 'captcha.failed',
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        details: { reason: 'CAPTCHA verification failed' },
      });
      throw err;
    }
  }

  // 2. Verify Password
  const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!passwordMatch) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updates: any = { failedLoginAttempts: failedAttempts };
    let reason = 'Incorrect password';

    if (failedAttempts >= 5) {
      updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      updates.failedLoginAttempts = 0; // reset counter
      reason = 'Account locked out (5 failed attempts)';
    }

    await userRepo.update(user.id, updates);
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: 'login.failed',
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details: { reason, failedAttempts },
    });
    throw GENERIC_ERROR;
  }

  // 3. Clear failed login count on successful authentication
  await userRepo.update(user.id, {
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: new Date(),
  });

  if (!user.emailVerified) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: 'login.failed',
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details: { reason: 'Email not verified' },
    });
    throw new AppError(
      'Please verify your email address before logging in',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  if (user.isBlocked) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: 'login.failed',
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details: { reason: 'Account suspended' },
    });
    throw new AppError('Account suspended. Contact support.', 403, 'ACCOUNT_BLOCKED');
  }

  // Successful login event log
  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: 'login.success',
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
  });

  // Track device & detect suspicious logins
  await trackDeviceAndDetectSuspicious(user, details.userAgent, details.ipAddress);

  // Generate tokens, store session, set cookies
  await generateAndSetTokens(res, user, {
    userAgent: details.userAgent,
    ipAddress: details.ipAddress,
    rememberMe: dto.rememberMe,
  });

  return sanitizeUser(user);
}

/**
 * Handles session refreshing using Refresh Token Rotation (RTR).
 * Implements Replay Detection to protect against stolen tokens.
 */
export async function refreshSession(
  reqToken: string | undefined,
  res: Response,
  details: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  if (!reqToken) {
    throw new AppError('Refresh token required', 401, 'REFRESH_TOKEN_REQUIRED');
  }

  const tokenHash = crypto.createHash('sha256').update(reqToken).digest('hex');

  // Find the session
  const session = await sessionRepo.findOne({
    where: { tokenHash },
    relations: ['user'],
  });

  if (!session) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Replay Detection: if the session has already been revoked, revoke ALL active sessions of this user
  if (session.isRevoked) {
    await sessionRepo.update({ userId: session.userId }, { isRevoked: true });
    throw new AppError(
      'Potential refresh token reuse detected. All sessions revoked for safety.',
      401,
      'REPLAY_DETECTED'
    );
  }

  // Expiration Check
  if (session.expiresAt < new Date()) {
    throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  const user = session.user;
  if (!user || user.isBlocked) {
    throw new AppError('User not found or suspended', 401, 'UNAUTHORIZED');
  }

  // RTR: Invalidate the used refresh token session
  await sessionRepo.update(session.id, { isRevoked: true });

  // Generate a brand new refresh token + access token
  await generateAndSetTokens(res, user, {
    userAgent: details.userAgent,
    ipAddress: details.ipAddress,
  });
}

/**
 * Logs out the user by revoking their current database session and clearing cookies.
 */
export async function logoutUser(
  res: Response,
  rawRefreshToken: string | undefined,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  let userId: string | null = null;
  let email: string | null = null;

  if (rawRefreshToken) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const session = await sessionRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    if (session) {
      await sessionRepo.update(session.id, { isRevoked: true });
      userId = session.userId;
      email = session.user?.email || null;
    }
  }

  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat',
    sameSite: 'lax',
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });

  if (userId || email) {
    await logSecurityEvent({
      userId,
      email,
      event: 'logout',
      ipAddress: details?.ipAddress ?? null,
      userAgent: details?.userAgent ?? null,
    });
  }
}

export async function getProfile(userId: string): Promise<ReturnType<typeof sanitizeUser>> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  return sanitizeUser(user);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await userRepo.findOne({ where: { email }, select: ['id', 'name', 'email'] });
  if (!user) return; // Silent — don't reveal if email exists

  const rawToken = await createEmailToken(user.id, EmailTokenType.PASSWORD_RESET);
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.PASSWORD_RESET);

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS.PASSWORD);

  // Revoke all active database sessions for this user
  await sessionRepo.update({ userId }, { isRevoked: true });

  // Increment tokenVersion to revoke all existing access tokens
  await userRepo
    .createQueryBuilder()
    .update(User)
    .set({
      passwordHash,
      tokenVersion: () => 'token_version + 1',
      passwordChangedAt: new Date(),
    })
    .where('id = :id', { id: userId })
    .execute();

  const user = await userRepo.findOne({ where: { id: userId }, select: ['email'] });
  if (user) {
    await logSecurityEvent({
      userId,
      email: user.email,
      event: 'password.change',
      ipAddress: details?.ipAddress ?? null,
      userAgent: details?.userAgent ?? null,
      details: { method: 'forgot_password_reset' },
    });
  }
}

/**
 * Returns all active (non-revoked, non-expired) sessions for the user.
 */
export async function getUserSessions(userId: string, currentRawRefreshToken?: string): Promise<any[]> {
  const sessions = await sessionRepo.find({
    where: { userId, isRevoked: false, expiresAt: MoreThan(new Date()) },
    order: { createdAt: 'DESC' },
  });

  const currentHash = currentRawRefreshToken
    ? crypto.createHash('sha256').update(currentRawRefreshToken).digest('hex')
    : null;

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    isCurrent: s.tokenHash === currentHash,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
}

/**
 * Revokes a specific session by ID.
 */
export async function revokeSessionById(userId: string, sessionId: string): Promise<void> {
  const session = await sessionRepo.findOne({ where: { id: sessionId, userId } });
  if (!session) {
    throw new AppError('Session not found', 404, 'NOT_FOUND');
  }
  await sessionRepo.update(session.id, { isRevoked: true });
}

/**
 * Revokes all sessions for a user (global logout) and increments tokenVersion.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  // Revoke all sessions in the DB
  await sessionRepo.update({ userId }, { isRevoked: true });

  // Increment tokenVersion on the user table to invalidate all active JWTs
  await userRepo
    .createQueryBuilder()
    .update(User)
    .set({ tokenVersion: () => 'token_version + 1' })
    .where('id = :userId', { userId })
    .execute();
}

/**
 * Changes the user's password, enforcing current password verification, history checks, and breach checks.
 * Revokes all active sessions on completion.
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // 1. Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Incorrect current password', 400, 'INCORRECT_CURRENT_PASSWORD');
  }

  // 2. Verify breach detection
  await verifyPasswordBreach(newPassword);

  // 3. Verify password history (prevent reusing last 5)
  await checkPasswordHistory(userId, newPassword);

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS.PASSWORD);

  // 4. Revoke active database sessions
  await sessionRepo.update({ userId }, { isRevoked: true });

  // 5. Update user password, increment tokenVersion (revoking access tokens), and reset flags
  await userRepo
    .createQueryBuilder()
    .update(User)
    .set({
      passwordHash: newHash,
      mustResetPassword: false,
      passwordChangedAt: new Date(),
      tokenVersion: () => 'token_version + 1',
    })
    .where('id = :userId', { userId })
    .execute();

  // 6. Save new password to history
  await savePasswordToHistory(userId, newHash);

  await logSecurityEvent({
    userId,
    email: user.email,
    event: 'password.change',
    ipAddress: details?.ipAddress ?? null,
    userAgent: details?.userAgent ?? null,
    details: { method: 'settings_password_change' },
  });
}

/**
 * Initiates an email change process. Sends a verification token to the new email address
 * and a warning/alert notification to the old email address.
 */
export async function requestEmailChange(
  userId: string,
  newEmail: string,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Check if the new email is already taken
  const exists = await userRepo.findOne({ where: { email: newEmail }, select: ['id'] });
  if (exists) {
    throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  // Set pending email
  await userRepo.update(userId, { pendingEmail: newEmail });

  // Create verification token and send emails
  const rawToken = await createEmailToken(userId, EmailTokenType.EMAIL_CHANGE);

  // Send verification link to new email address
  await sendEmailChangeVerificationEmail({
    to: newEmail,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });

  // Send warning/alert to old email address
  await sendEmailChangeAlertEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    newEmail,
  });

  await logSecurityEvent({
    userId,
    email: user.email,
    event: 'email.change.request',
    ipAddress: details?.ipAddress ?? null,
    userAgent: details?.userAgent ?? null,
    details: { newEmail },
  });
}

/**
 * Verifies and completes an email change process.
 */
export async function verifyEmailChange(
  token: string,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_CHANGE);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (!user.pendingEmail) {
    throw new AppError('No email change request found', 400, 'NO_EMAIL_CHANGE_REQUEST');
  }

  // Final check to make sure pending email wasn't registered in the meantime
  const exists = await userRepo.findOne({ where: { email: user.pendingEmail }, select: ['id'] });
  if (exists) {
    throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  const newEmail = user.pendingEmail;
  const oldEmail = user.email;

  // Revoke all active database sessions
  await sessionRepo.update({ userId }, { isRevoked: true });

  // Update email, clear pendingEmail, set emailChangedAt, and increment tokenVersion (revoking access tokens)
  await userRepo
    .createQueryBuilder()
    .update(User)
    .set({
      email: newEmail,
      pendingEmail: null,
      emailChangedAt: new Date(),
      tokenVersion: () => 'token_version + 1',
    })
    .where('id = :userId', { userId })
    .execute();

  await logSecurityEvent({
    userId,
    email: newEmail,
    event: 'email.change.verify',
    ipAddress: details?.ipAddress ?? null,
    userAgent: details?.userAgent ?? null,
    details: { oldEmail, newEmail },
  });
}

/**
 * Retrieves recognized devices for a specific user.
 */
export async function getUserDevices(userId: string): Promise<UserDevice[]> {
  const deviceRepo = AppDataSource.getRepository(UserDevice);
  return deviceRepo.find({
    where: { userId },
    order: { lastActiveAt: 'DESC' },
  });
}

/**
 * Marks a specific device as trusted.
 */
export async function trustDeviceById(userId: string, deviceId: string): Promise<void> {
  const deviceRepo = AppDataSource.getRepository(UserDevice);
  const device = await deviceRepo.findOne({ where: { id: deviceId, userId } });
  if (!device) {
    throw new AppError('Device not found', 404, 'NOT_FOUND');
  }
  await deviceRepo.update(device.id, { isTrusted: true });
}

/**
 * Revokes a specific device (deletes it, forcing it to trigger login verification again on next login).
 */
export async function revokeDeviceById(userId: string, deviceId: string): Promise<void> {
  const deviceRepo = AppDataSource.getRepository(UserDevice);
  const device = await deviceRepo.findOne({ where: { id: deviceId, userId } });
  if (!device) {
    throw new AppError('Device not found', 404, 'NOT_FOUND');
  }
  await deviceRepo.remove(device);
}

/**
 * Completes the OAuth login session initialization process.
 */
export async function establishOAuthSession(
  res: Response,
  user: User,
  details: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  // Track device & detect suspicious logins
  await trackDeviceAndDetectSuspicious(user, details.userAgent, details.ipAddress);

  // Generate tokens, store session, set cookies
  await generateAndSetTokens(res, user, {
    userAgent: details.userAgent,
    ipAddress: details.ipAddress,
    rememberMe: true,
  });
}

export async function registerAdmin(
  dto: RegisterDto,
  details?: { userAgent: string | null; ipAddress: string | null }
): Promise<void> {
  const exists = await userRepo.findOne({
    where: { email: dto.email },
    select: ['id'],
  });
  if (exists) {
    throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  // Verify that the password is not leaked/breached
  await verifyPasswordBreach(dto.password);

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

  const user = userRepo.create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    companyName: dto.companyName ?? null,
    country: dto.country ?? null,
    accountType: AccountType.ADMIN,
    status: UserStatus.PENDING_APPROVAL,
    emailVerified: false,
    passwordChangedAt: new Date(),
  });

  await userRepo.save(user);

  // Save the initial password to history
  await savePasswordToHistory(user.id, passwordHash);

  // Log registration success
  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: 'admin_register.success',
    ipAddress: details?.ipAddress ?? null,
    userAgent: details?.userAgent ?? null,
  });

  const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
  await sendAdminVerificationEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });
}

export async function verifyAdminEmail(token: string): Promise<{ superAdminExists: boolean; user: User }> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_VERIFICATION);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  user.emailVerified = true;
  await userRepo.save(user);

  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const superAdminCount = await userRoleRepo.count({
    where: {
      role: {
        slug: 'super-admin'
      }
    },
    relations: ['role']
  });

  const superAdminExists = superAdminCount > 0;

  if (superAdminExists) {
    // Notify Super Admins
    const superAdmins = await userRoleRepo.find({
      where: {
        role: {
          slug: 'super-admin'
        }
      },
      relations: ['user', 'role']
    });

    for (const sa of superAdmins) {
      if (sa.user && sa.user.email) {
        await sendAdminRegistrationNotification({
          to: sa.user.email,
          adminName: user.name,
          adminEmail: user.email,
        });
      }
    }
  } else {
    // Create SYSTEM_OWNER_APPROVAL token (valid for 30 minutes, single use)
    const rawToken = await createEmailToken(user.id, EmailTokenType.SYSTEM_OWNER_APPROVAL);
    const bootstrapLink = `${env.FRONTEND_ADMIN_URL}/bootstrap?token=${rawToken}`;

    // Send email to SYSTEM_OWNER_EMAIL
    await sendAdminBootstrapNotification({
      to: env.SYSTEM_OWNER_EMAIL,
      adminName: user.name,
      adminEmail: user.email,
      bootstrapLink,
    });
  }

  return { superAdminExists, user };
}

export async function verifyBootstrapToken(token: string): Promise<{ name: string; email: string }> {
  // Check if a Super Admin already exists in the system
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const superAdminCount = await userRoleRepo.count({
    where: {
      role: { slug: 'super-admin' }
    },
    relations: ['role']
  });

  if (superAdminCount > 0) {
    throw new AppError('Bootstrap is disabled because a Super Admin already exists.', 400, 'BOOTSTRAP_DISABLED');
  }

  // Get token details without consuming
  const { user } = await getValidTokenDetails(token, EmailTokenType.SYSTEM_OWNER_APPROVAL);
  return {
    name: user.name,
    email: user.email,
  };
}

export async function approveBootstrapAdmin(token: string, action: 'approve' | 'reject' = 'approve'): Promise<void> {
  // Check if a Super Admin already exists in the system
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const superAdminCount = await userRoleRepo.count({
    where: {
      role: { slug: 'super-admin' }
    },
    relations: ['role']
  });

  if (superAdminCount > 0) {
    throw new AppError('Bootstrap is disabled because a Super Admin already exists.', 400, 'BOOTSTRAP_DISABLED');
  }

  // Verify and consume the token
  const userId = await verifyAndConsumeToken(token, EmailTokenType.SYSTEM_OWNER_APPROVAL);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (action === 'approve') {
    // Mark status as active and verify email
    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    await userRepo.save(user);

    // Assign super-admin role
    const roleRepo = AppDataSource.getRepository(Role);
    let superAdminRole = await roleRepo.findOne({ where: { slug: 'super-admin' } });
    if (!superAdminRole) {
      superAdminRole = roleRepo.create({
        slug: 'super-admin',
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      });
      await roleRepo.save(superAdminRole);

      const versionRepo = AppDataSource.getRepository(RoleVersion);
      const superAdminVersion = versionRepo.create({
        roleId: superAdminRole.id,
        version: 1,
        name: 'Super Admin',
        description: 'System Super Administrator. Has all system permissions by default.',
        status: RoleVersionStatus.APPROVED,
      });
      await versionRepo.save(superAdminVersion);

      superAdminRole.activeVersionId = superAdminVersion.id;
      await roleRepo.save(superAdminRole);
    }

    const assignment = userRoleRepo.create({
      userId: user.id,
      roleId: superAdminRole.id,
      assignedBy: user,
      assignedAt: new Date(),
    });
    await userRoleRepo.save(assignment);

    // Send success/approval notification email
    await sendAdminApprovalStatusEmail({
      to: user.email,
      name: user.name,
      status: 'approved',
    });
  } else {
    // Reject
    user.status = UserStatus.REJECTED;
    user.rejectionReason = 'Rejected by System Owner during bootstrap setup';
    await userRepo.save(user);

    // Send rejection email
    await sendAdminApprovalStatusEmail({
      to: user.email,
      name: user.name,
      status: 'rejected',
      reason: 'Rejected by System Owner during bootstrap setup',
    });
  }
}

export async function ownerReview(token: string, action: 'approve' | 'reject'): Promise<void> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.SYSTEM_OWNER_APPROVAL);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (action === 'approve') {
    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    await userRepo.save(user);

    const roleRepo = AppDataSource.getRepository(Role);
    const userRoleRepo = AppDataSource.getRepository(UserRole);

     let superAdminRole = await roleRepo.findOne({ where: { slug: 'super-admin' } });
     if (!superAdminRole) {
       superAdminRole = roleRepo.create({
         slug: 'super-admin',
         isSystemRole: true,
         status: RoleStatus.ACTIVE,
       });
       await roleRepo.save(superAdminRole);

       const versionRepo = AppDataSource.getRepository(RoleVersion);
       const superAdminVersion = versionRepo.create({
         roleId: superAdminRole.id,
         version: 1,
         name: 'Super Admin',
         description: 'System Super Administrator. Has all system permissions by default.',
         status: RoleVersionStatus.APPROVED,
       });
       await versionRepo.save(superAdminVersion);

       superAdminRole.activeVersionId = superAdminVersion.id;
       await roleRepo.save(superAdminRole);
     }

    const assignment = userRoleRepo.create({
      userId: user.id,
      roleId: superAdminRole.id,
      assignedBy: user,
      assignedAt: new Date(),
    });
    await userRoleRepo.save(assignment);

    await sendAdminApprovalStatusEmail({
      to: user.email,
      name: user.name,
      status: 'approved',
    });
  } else {
    user.status = UserStatus.REJECTED;
    user.rejectionReason = 'Rejected by System Owner';
    await userRepo.save(user);

    await sendAdminApprovalStatusEmail({
      to: user.email,
      name: user.name,
      status: 'rejected',
      reason: 'Rejected by System Owner',
    });
  }
}

export async function loginAdmin(
  dto: LoginDto & { captchaToken?: string },
  res: Response,
  details: { userAgent: string | null; ipAddress: string | null }
): Promise<ReturnType<typeof sanitizeUser>> {
  const GENERIC_ERROR = new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const user = await userRepo.findOne({
    where: { email: dto.email },
  });
  if (!user) {
    throw GENERIC_ERROR;
  }

  if (user.accountType !== AccountType.ADMIN) {
    throw GENERIC_ERROR;
  }

  // 1. Check Lockout Status
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
    throw new AppError(
      `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      403,
      'ACCOUNT_LOCKED'
    );
  }

  // Enforce CAPTCHA check if failed login attempts >= 3
  if (user.failedLoginAttempts >= 3) {
    if (!dto.captchaToken) {
      throw new AppError('CAPTCHA verification required', 400, 'CAPTCHA_REQUIRED');
    }
    await verifyCaptcha(dto.captchaToken);
  }

  // 2. Verify Password
  const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!passwordMatch) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updates: any = { failedLoginAttempts: failedAttempts };
    if (failedAttempts >= 5) {
      updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      updates.failedLoginAttempts = 0;
    }
    await userRepo.update(user.id, updates);
    throw GENERIC_ERROR;
  }

  // 3. Clear failed login count
  await userRepo.update(user.id, {
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: new Date(),
  });

  // 4. Check Email Verification & Status
  if (!user.emailVerified) {
    throw new AppError(
      'Please verify your email address before logging in',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  // Status check
  if (user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
    throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
  }

  if (user.status === UserStatus.PENDING_APPROVAL) {
    throw new AppError('Your administrator account is awaiting approval.', 403, 'PENDING_APPROVAL');
  }

  if (user.status === UserStatus.REJECTED) {
    throw new AppError('Your administrator account request has been rejected.', 403, 'REJECTED');
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError('Your account has been suspended. Contact the system administrator.', 403, 'ACCOUNT_BLOCKED');
  }

  // Generate tokens & set cookies
  await generateAndSetTokens(res, user, {
    userAgent: details.userAgent,
    ipAddress: details.ipAddress,
    rememberMe: dto.rememberMe,
  });

  return sanitizeUser(user);
}


