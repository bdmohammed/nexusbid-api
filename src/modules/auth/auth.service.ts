import crypto from 'node:crypto';

import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MoreThan } from 'typeorm';

import { AppDataSource } from '../../config/database';
import { env } from '../../config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { BCRYPT_ROUNDS, JWT_COOKIE_NAME } from '../../core/constants';
import { Country } from '../../database/entities/Country';
import { EmailToken } from '../../database/entities/EmailToken';
import { Role } from '../../database/entities/Role';
import { RoleVersion } from '../../database/entities/RoleVersion';
import { User } from '../../database/entities/User';
import { UserDevice } from '../../database/entities/UserDevice';
import { UserRole } from '../../database/entities/UserRole';
import { UserSession } from '../../database/entities/UserSession';
import {
  sendAdminApprovalStatusEmail,
  sendAdminBootstrapNotification, // keep imports aligned if needed, but not needed
  sendAdminRegistrationNotification,
  sendAdminVerificationEmail,
  sendEmailChangeAlertEmail,
  sendEmailChangeVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../../services/email.service';
import {
  createEmailToken,
  getValidTokenDetails,
  verifyAndConsumeToken,
} from '../../services/token.service';
import { AccountType, EmailTokenType, SecurityEvent, UserStatus } from '../../types/enums';

import {
  checkPasswordHistory,
  savePasswordToHistory,
  trackDeviceAndDetectSuspicious,
  verifyCaptcha,
  verifyPasswordBreach,
} from './security.service';
import { logSecurityEvent } from './securityLog.service';

import type { JwtPayload } from '../../types/express.d';
import type { LoginDto, RegisterDto } from './auth.dto';
import type { Response } from 'express';
import type { DeepPartial } from 'typeorm';
import { RoleStatus, RoleVersionStatus } from '@/types/enums';

const userRepository = AppDataSource.getRepository(User);
const userSessionRepository = AppDataSource.getRepository(UserSession);

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
function sanitizeUser(
  user: User,
): Omit<User, 'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockoutUntil'> {
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
  connectionContext: {
    userAgent: string | null;
    ipAddress: string | null;
    rememberMe?: boolean | undefined;
  },
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
  } else if (connectionContext.rememberMe) {
    refreshTtl = REFRESH_EXPIRY.REMEMBER_ME;
  }

  const expiresAt = new Date(Date.now() + refreshTtl);

  // 3. Save UserSession in DB
  const session = userSessionRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt,
    userAgent: connectionContext.userAgent,
    ipAddress: connectionContext.ipAddress,
  });
  await userSessionRepository.save(session);

  // 4. Set Access Token Cookie
  res.cookie(JWT_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: ['prod', 'uat'].includes(env.NODE_ENV),
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  // 5. Set Refresh Token Cookie (scoped to /api/v1/auth)
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: ['prod', 'uat'].includes(env.NODE_ENV),
    sameSite: 'lax',
    maxAge: refreshTtl,
    path: '/api/v1/auth',
  });
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export async function registerUser(
  dto: RegisterDto,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const exists = await userRepository.findOne({
    where: { email: dto.email },
    select: ['id'],
  });
  if (exists) {
    throw new AppError(
      AppErrorMessage.EMAIL_REGISTERED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.EMAIL_TAKEN,
    );
  }

  // Verify that the password is not leaked/breached
  await verifyPasswordBreach(dto.password);

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

  let country: Country | undefined;
  if (dto.country) {
    const countryRepo = AppDataSource.getRepository(Country);
    const countryObj = await countryRepo.findOne({
      where: [{ id: dto.country }, { name: dto.country }, { code: dto.country }],
    });
    if (!countryObj) {
      throw new AppError(
        'Country not found',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    country = countryObj;
  }

  const userInput: DeepPartial<User> = {
    name: dto.name,
    email: dto.email,
    passwordHash,
    accountType: AccountType.USER,
    status: UserStatus.PENDING_EMAIL_VERIFICATION,
    emailVerified: false,
    passwordChangedAt: new Date(),
  };

  if (dto.companyName) {
    userInput.companyName = dto.companyName;
  }
  if (country) {
    userInput.country = country;
  }

  const user = userRepository.create(userInput);

  await userRepository.save(user);

  // Save the initial password to history
  await savePasswordToHistory(user.id, passwordHash);

  // Log registration success
  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: SecurityEvent.REGISTER_SUCCESS,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
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
  await userRepository.update(userId, { emailVerified: true, status: UserStatus.ACTIVE });
}

export async function resendVerification(
  email: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const user = await userRepository.findOne({ where: { email } });

  // Return silently if user does not exist (avoid email enumeration)
  if (!user) {
    return;
  }

  // Return silently if already verified
  if (user.emailVerified) {
    return;
  }

  // Delete any pending verification tokens for this user first
  const emailTokenRepository = AppDataSource.getRepository(EmailToken);
  await emailTokenRepository.delete({ userId: user.id, type: EmailTokenType.EMAIL_VERIFICATION });

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
    event: SecurityEvent.RESEND_VERIFICATION_SUCCESS,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
  });
}

export async function loginUser(
  dto: LoginDto,
  res: Response,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<ReturnType<typeof sanitizeUser>> {
  const GENERIC_ERROR = new AppError(
    AppErrorMessage.INVALID_CREDENTIALS,
    HttpStatusCode.UNAUTHORIZED,
    AppErrorCode.INVALID_CREDENTIALS,
  );

  const user = await userRepository.findOne({
    where: { email: dto.email },
  });
  if (!user) {
    await logSecurityEvent({
      email: dto.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
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
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: 'Account locked out' },
    });
    throw new AppError(
      AppErrorMessage.ACCOUNT_LOCKED_TEMPORARY(minutesLeft),
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_LOCKED,
    );
  }

  // 1.5. CAPTCHA Check (Enforced if failed attempts >= 3)
  if (user.failedLoginAttempts >= 3) {
    if (!dto.captchaToken) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        event: SecurityEvent.CAPTCHA_FAILED,
        ipAddress: connectionContext.ipAddress,
        userAgent: connectionContext.userAgent,
        details: { reason: 'CAPTCHA token missing' },
      });
      throw new AppError(
        AppErrorMessage.CAPTCHA_VERIFICATION_REQUIRED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.CAPTCHA_REQUIRED,
      );
    }
    try {
      await verifyCaptcha(dto.captchaToken);
    } catch (error) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        event: SecurityEvent.CAPTCHA_FAILED,
        ipAddress: connectionContext.ipAddress,
        userAgent: connectionContext.userAgent,
        details: { reason: 'CAPTCHA verification failed' },
      });
      throw error;
    }
  }

  // 2. Verify Password
  const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!passwordMatch) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updates = { failedLoginAttempts: failedAttempts };
    let reason = 'Incorrect password';

    if (failedAttempts >= 5) {
      // updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      updates.failedLoginAttempts = 0; // reset counter
      reason = 'Account locked out (5 failed attempts)';
    }

    await userRepository.update(user.id, updates);
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason, failedAttempts },
    });
    throw GENERIC_ERROR;
  }

  // 3. Clear failed login count on successful authentication
  await userRepository.update(user.id, {
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: new Date(),
  });

  if (!user.emailVerified) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: 'Email not verified' },
    });
    throw new AppError(
      AppErrorMessage.VERIFY_EMAIL_BEFORE_LOGIN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  if (user.isBlocked) {
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: SecurityEvent.LOGIN_FAILED,
      ipAddress: connectionContext.ipAddress,
      userAgent: connectionContext.userAgent,
      details: { reason: 'Account suspended' },
    });
    throw new AppError(
      AppErrorMessage.ACCOUNT_SUSPENDED_CONTACT_SUPPORT,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_BLOCKED,
    );
  }

  // Successful login event log
  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: SecurityEvent.LOGIN_SUCCESS,
    ipAddress: connectionContext.ipAddress,
    userAgent: connectionContext.userAgent,
  });

  // Track device & detect suspicious logins
  await trackDeviceAndDetectSuspicious(
    user,
    connectionContext.userAgent,
    connectionContext.ipAddress,
  );

  // Generate tokens, store session, set cookies
  await generateAndSetTokens(res, user, {
    userAgent: connectionContext.userAgent,
    ipAddress: connectionContext.ipAddress,
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
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  if (!reqToken) {
    throw new AppError(
      AppErrorMessage.REFRESH_TOKEN_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.REFRESH_TOKEN_REQUIRED,
    );
  }

  const tokenHash = crypto.createHash('sha256').update(reqToken).digest('hex');

  // Find the session
  const session = await userSessionRepository.findOne({
    where: { tokenHash },
    relations: ['user'],
  });

  if (!session) {
    throw new AppError(
      AppErrorMessage.INVALID_REFRESH_TOKEN,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.INVALID_REFRESH_TOKEN,
    );
  }

  // Replay Detection: if the session has already been revoked, revoke ALL active sessions of this user
  if (session.isRevoked) {
    await userSessionRepository.update({ userId: session.userId }, { isRevoked: true });
    throw new AppError(
      AppErrorMessage.REFRESH_TOKEN_REUSE_DETECTED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.REPLAY_DETECTED,
    );
  }

  // Expiration Check
  if (session.expiresAt < new Date()) {
    throw new AppError(
      AppErrorMessage.REFRESH_TOKEN_EXPIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.REFRESH_TOKEN_EXPIRED,
    );
  }

  const { user } = session;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!user || user.isBlocked) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND_OR_SUSPENDED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }

  // RTR: Invalidate the used refresh token session
  await userSessionRepository.update(session.id, { isRevoked: true });

  // Generate a brand new refresh token + access token
  await generateAndSetTokens(res, user, {
    userAgent: connectionContext.userAgent,
    ipAddress: connectionContext.ipAddress,
  });
}

/**
 * Logs out the user by revoking their current database session and clearing cookies.
 */

export async function logoutUser(
  res: Response,
  rawRefreshToken: string | undefined,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  let userId: string | null = null;
  let email: string | null = null;

  if (rawRefreshToken) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const session = await userSessionRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    if (session) {
      await userSessionRepository.update(session.id, { isRevoked: true });
      // eslint-disable-next-line prefer-destructuring
      userId = session.userId;
      // eslint-disable-next-line prefer-destructuring
      email = session.user.email;
    }
  }

  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: ['prod', 'uat'].includes(env.NODE_ENV),
    sameSite: 'lax',
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: ['prod', 'uat'].includes(env.NODE_ENV),
    sameSite: 'lax',
    path: '/api/v1/auth',
  });

  if (userId ?? email) {
    await logSecurityEvent({
      userId,
      email,
      event: SecurityEvent.LOGOUT,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
    });
  }
}

export async function getProfile(userId: string): Promise<ReturnType<typeof sanitizeUser>> {
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  return sanitizeUser(user);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await userRepository.findOne({ where: { email }, select: ['id', 'name', 'email'] });
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
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.PASSWORD_RESET);

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS.PASSWORD);

  // Revoke all active database sessions for this user
  await userSessionRepository.update({ userId }, { isRevoked: true });

  // Increment tokenVersion to revoke all existing access tokens
  await userRepository
    .createQueryBuilder()
    .update(User)
    .set({
      passwordHash,
      tokenVersion: () => 'token_version + 1',
      passwordChangedAt: new Date(),
    })
    .where('id = :id', { id: userId })
    .execute();

  const user = await userRepository.findOne({ where: { id: userId }, select: ['email'] });
  if (user) {
    await logSecurityEvent({
      userId,
      email: user.email,
      event: SecurityEvent.PASSWORD_CHANGE,
      ipAddress: connectionContext?.ipAddress ?? null,
      userAgent: connectionContext?.userAgent ?? null,
      details: { method: 'forgot_password_reset' },
    });
  }
}

/**
 * Returns all active (non-revoked, non-expired) sessions for the user.
 */
export async function getUserSessions(userId: string, currentRawRefreshToken?: string) {
  const sessions = await userSessionRepository.find({
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
  const session = await userSessionRepository.findOne({ where: { id: sessionId, userId } });
  if (!session) {
    throw new AppError(
      AppErrorMessage.SESSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  await userSessionRepository.update(session.id, { isRevoked: true });
}

/**
 * Revokes all sessions for a user (global logout) and increments tokenVersion.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  // Revoke all sessions in the DB
  await userSessionRepository.update({ userId }, { isRevoked: true });

  // Increment tokenVersion on the user table to invalidate all active JWTs
  await userRepository
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
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  // 1. Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError(
      AppErrorMessage.INCORRECT_CURRENT_PASSWORD,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.INCORRECT_CURRENT_PASSWORD,
    );
  }

  // 2. Verify breach detection
  await verifyPasswordBreach(newPassword);

  // 3. Verify password history (prevent reusing last 5)
  await checkPasswordHistory(userId, newPassword);

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS.PASSWORD);

  // 4. Revoke active database sessions
  await userSessionRepository.update({ userId }, { isRevoked: true });

  // 5. Update user password, increment tokenVersion (revoking access tokens), and reset flags
  await userRepository
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
    event: SecurityEvent.PASSWORD_CHANGE,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
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
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  // Check if the new email is already taken
  const exists = await userRepository.findOne({ where: { email: newEmail }, select: ['id'] });
  if (exists) {
    throw new AppError(
      AppErrorMessage.EMAIL_REGISTERED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.EMAIL_TAKEN,
    );
  }

  // Set pending email
  await userRepository.update(userId, { pendingEmail: newEmail });

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
    event: SecurityEvent.EMAIL_CHANGE_REQUEST,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { newEmail },
  });
}

/**
 * Verifies and completes an email change process.
 */
export async function verifyEmailChange(
  token: string,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_CHANGE);

  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  if (!user.pendingEmail) {
    throw new AppError(
      AppErrorMessage.NO_EMAIL_CHANGE_REQUEST,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.NO_EMAIL_CHANGE_REQUEST,
    );
  }

  // Final check to make sure pending email wasn't registered in the meantime
  const exists = await userRepository.findOne({
    where: { email: user.pendingEmail },
    select: ['id'],
  });
  if (exists) {
    throw new AppError(
      AppErrorMessage.EMAIL_REGISTERED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.EMAIL_TAKEN,
    );
  }

  const newEmail = user.pendingEmail;
  const oldEmail = user.email;

  // Revoke all active database sessions
  await userSessionRepository.update({ userId }, { isRevoked: true });

  // Update email, clear pendingEmail, set emailChangedAt, and increment tokenVersion (revoking access tokens)
  await userRepository
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
    event: SecurityEvent.EMAIL_CHANGE_SUCCESS,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
    details: { oldEmail, newEmail },
  });
}

/**
 * Retrieves recognized devices for a specific user.
 */
export async function getUserDevices(userId: string): Promise<UserDevice[]> {
  const userDeviceRepository = AppDataSource.getRepository(UserDevice);
  return userDeviceRepository.find({
    where: { userId },
    order: { lastActiveAt: 'DESC' },
  });
}

/**
 * Marks a specific device as trusted.
 */
export async function trustDeviceById(userId: string, deviceId: string): Promise<void> {
  const userDeviceRepository = AppDataSource.getRepository(UserDevice);
  const device = await userDeviceRepository.findOne({ where: { id: deviceId, userId } });
  if (!device) {
    throw new AppError(
      AppErrorMessage.DEVICE_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  await userDeviceRepository.update(device.id, { isTrusted: true });
}

/**
 * Revokes a specific device (deletes it, forcing it to trigger login verification again on next login).
 */
export async function revokeDeviceById(userId: string, deviceId: string): Promise<void> {
  const userDeviceRepository = AppDataSource.getRepository(UserDevice);
  const device = await userDeviceRepository.findOne({ where: { id: deviceId, userId } });
  if (!device) {
    throw new AppError(
      AppErrorMessage.DEVICE_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  await userDeviceRepository.remove(device);
}

/**
 * Completes the OAuth login session initialization process.
 */
export async function establishOAuthSession(
  res: Response,
  user: User,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  // Track device & detect suspicious logins
  await trackDeviceAndDetectSuspicious(
    user,
    connectionContext.userAgent,
    connectionContext.ipAddress,
  );

  // Generate tokens, store session, set cookies
  await generateAndSetTokens(res, user, {
    userAgent: connectionContext.userAgent,
    ipAddress: connectionContext.ipAddress,
    rememberMe: true,
  });
}

export async function registerAdmin(
  dto: RegisterDto,
  connectionContext?: { userAgent: string | null; ipAddress: string | null },
): Promise<void> {
  const exists = await userRepository.findOne({
    where: { email: dto.email },
    select: ['id'],
  });
  if (exists) {
    throw new AppError(
      AppErrorMessage.EMAIL_REGISTERED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.EMAIL_TAKEN,
    );
  }

  // Verify that the password is not leaked/breached
  await verifyPasswordBreach(dto.password);

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

  let country: Country | undefined;
  if (dto.country) {
    const countryRepo = AppDataSource.getRepository(Country);
    const countryObj = await countryRepo.findOne({
      where: [{ id: dto.country }, { name: dto.country }, { code: dto.country }],
    });
    if (!countryObj) {
      throw new AppError(
        'Country not found',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    country = countryObj;
  }

  const userInput: DeepPartial<User> = {
    name: dto.name,
    email: dto.email,
    passwordHash,
    accountType: AccountType.ADMIN,
    status: UserStatus.PENDING_APPROVAL,
    emailVerified: false,
    passwordChangedAt: new Date(),
  };

  if (dto.companyName) {
    userInput.companyName = dto.companyName;
  }
  if (country) {
    userInput.country = country;
  }

  const user = userRepository.create(userInput);

  await userRepository.save(user);

  // Save the initial password to history
  await savePasswordToHistory(user.id, passwordHash);

  // Log registration success
  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: SecurityEvent.ADMIN_REGISTER_SUCCESS,
    ipAddress: connectionContext?.ipAddress ?? null,
    userAgent: connectionContext?.userAgent ?? null,
  });

  const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
  await sendAdminVerificationEmail({
    to: user.email,
    name: user.name,
    userId: user.id,
    token: rawToken,
  });
}

export async function verifyAdminEmail(
  token: string,
): Promise<{ superAdminExists: boolean; user: User }> {
  const userId = await verifyAndConsumeToken(token, EmailTokenType.EMAIL_VERIFICATION);
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.USER_NOT_FOUND,
    );
  }

  user.emailVerified = true;
  await userRepository.save(user);

  const userRoleRepository = AppDataSource.getRepository(UserRole);
  const superAdminCount = await userRoleRepository.count({
    where: {
      role: {
        key: 'super-admin',
      },
    },
    relations: ['role'],
  });

  const superAdminExists = superAdminCount > 0;

  if (superAdminExists) {
    // Notify Super Admins
    const superAdmins = await userRoleRepository.find({
      where: {
        role: {
          key: 'super-admin',
        },
      },
      relations: ['user', 'role'],
    });

    for await (const sa of superAdmins) {
      if (sa.user.email) {
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

export async function verifyBootstrapToken(
  token: string,
): Promise<{ name: string; email: string }> {
  // Check if a Super Admin already exists in the system
  const userRoleRepository = AppDataSource.getRepository(UserRole);
  const superAdminCount = await userRoleRepository.count({
    where: {
      role: { key: 'super-admin' },
    },
    relations: ['role'],
  });

  if (superAdminCount > 0) {
    throw new AppError(
      AppErrorMessage.BOOTSTRAP_DISABLED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BOOTSTRAP_DISABLED,
    );
  }

  // Get token details without consuming
  const { user } = await getValidTokenDetails(token, EmailTokenType.SYSTEM_OWNER_APPROVAL);
  return {
    name: user.name,
    email: user.email,
  };
}

export async function approveBootstrapAdmin(
  token: string,
  action: 'approve' | 'reject' = 'approve',
): Promise<void> {
  // Check if a Super Admin already exists in the system
  const userRoleRepository = AppDataSource.getRepository(UserRole);
  const superAdminCount = await userRoleRepository.count({
    where: {
      role: { key: 'super-admin' },
    },
    relations: ['role'],
  });

  if (superAdminCount > 0) {
    throw new AppError(
      AppErrorMessage.BOOTSTRAP_DISABLED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BOOTSTRAP_DISABLED,
    );
  }

  // Verify and consume the token
  const userId = await verifyAndConsumeToken(token, EmailTokenType.SYSTEM_OWNER_APPROVAL);
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.USER_NOT_FOUND,
    );
  }

  if (action === 'approve') {
    // Mark status as active and verify email
    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    await userRepository.save(user);

    // Assign super-admin role
    const roleRepository = AppDataSource.getRepository(Role);
    let superAdminRole = await roleRepository.findOne({ where: { key: 'super-admin' } });
    if (!superAdminRole) {
      superAdminRole = roleRepository.create({
        key: 'super-admin',
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      });
      await roleRepository.save(superAdminRole);

      const roleVersionRepository = AppDataSource.getRepository(RoleVersion);
      const superAdminVersion = roleVersionRepository.create({
        roleId: superAdminRole.id,
        version: 1,
        name: 'Super Admin',
        description: 'System Super Administrator. Has all system permissions by default.',
        status: RoleVersionStatus.APPROVED,
      });
      await roleVersionRepository.save(superAdminVersion);

      superAdminRole.activeVersionId = superAdminVersion.id;
      await roleRepository.save(superAdminRole);
    }

    const assignment = userRoleRepository.create({
      userId: user.id,
      roleId: superAdminRole.id,
      assignedBy: user,
      assignedAt: new Date(),
    });
    await userRoleRepository.save(assignment);

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
    await userRepository.save(user);

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
  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.USER_NOT_FOUND,
    );
  }

  if (action === 'approve') {
    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    await userRepository.save(user);

    const roleRepository = AppDataSource.getRepository(Role);
    const userRoleRepository = AppDataSource.getRepository(UserRole);

    let superAdminRole = await roleRepository.findOne({ where: { key: 'super-admin' } });
    if (!superAdminRole) {
      superAdminRole = roleRepository.create({
        key: 'super-admin',
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      });
      await roleRepository.save(superAdminRole);

      const roleVersionRepository = AppDataSource.getRepository(RoleVersion);
      const superAdminVersion = roleVersionRepository.create({
        roleId: superAdminRole.id,
        version: 1,
        name: 'Super Admin',
        description: 'System Super Administrator. Has all system permissions by default.',
        status: RoleVersionStatus.APPROVED,
      });
      await roleVersionRepository.save(superAdminVersion);

      superAdminRole.activeVersionId = superAdminVersion.id;
      await roleRepository.save(superAdminRole);
    }

    const assignment = userRoleRepository.create({
      userId: user.id,
      roleId: superAdminRole.id,
      assignedBy: user,
      assignedAt: new Date(),
    });
    await userRoleRepository.save(assignment);

    await sendAdminApprovalStatusEmail({
      to: user.email,
      name: user.name,
      status: 'approved',
    });
  } else {
    user.status = UserStatus.REJECTED;
    user.rejectionReason = 'Rejected by System Owner';
    await userRepository.save(user);

    await sendAdminApprovalStatusEmail({
      to: user.email,
      name: user.name,
      status: 'rejected',
      reason: 'Rejected by System Owner',
    });
  }
}

// eslint-disable-next-line complexity
export async function loginAdmin(
  dto: LoginDto,
  res: Response,
  connectionContext: { userAgent: string | null; ipAddress: string | null },
): Promise<ReturnType<typeof sanitizeUser>> {
  const GENERIC_ERROR = new AppError(
    AppErrorMessage.INVALID_CREDENTIALS,
    HttpStatusCode.UNAUTHORIZED,
    AppErrorCode.INVALID_CREDENTIALS,
  );

  const user = await userRepository.findOne({
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
      AppErrorMessage.ACCOUNT_LOCKED_TEMPORARY(minutesLeft),
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_LOCKED,
    );
  }

  // Enforce CAPTCHA check if failed login attempts >= 3
  if (user.failedLoginAttempts >= 3) {
    if (!dto.captchaToken) {
      throw new AppError(
        AppErrorMessage.CAPTCHA_VERIFICATION_REQUIRED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.CAPTCHA_REQUIRED,
      );
    }
    await verifyCaptcha(dto.captchaToken);
  }

  // 2. Verify Password
  const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!passwordMatch) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updates = { failedLoginAttempts: failedAttempts };
    if (failedAttempts >= 5) {
      // updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      updates.failedLoginAttempts = 0;
    }
    await userRepository.update(user.id, updates);
    throw GENERIC_ERROR;
  }

  // 3. Clear failed login count
  await userRepository.update(user.id, {
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: new Date(),
  });

  // 4. Check Email Verification & Status
  if (!user.emailVerified) {
    throw new AppError(
      AppErrorMessage.VERIFY_EMAIL_BEFORE_LOGIN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  // Status check
  if (user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
    throw new AppError(
      AppErrorMessage.VERIFY_EMAIL_BEFORE_LOGIN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.EMAIL_NOT_VERIFIED,
    );
  }

  if (user.status === UserStatus.PENDING_APPROVAL) {
    throw new AppError(
      AppErrorMessage.ADMIN_ACCOUNT_AWAITING_APPROVAL,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.PENDING_APPROVAL,
    );
  }

  if (user.status === UserStatus.REJECTED) {
    throw new AppError(
      AppErrorMessage.ADMIN_ACCOUNT_REJECTED,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.REJECTED,
    );
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(
      AppErrorMessage.ACCOUNT_SUSPENDED_CONTACT_ADMIN,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCOUNT_BLOCKED,
    );
  }

  // Generate tokens & set cookies
  await generateAndSetTokens(res, user, {
    userAgent: connectionContext.userAgent,
    ipAddress: connectionContext.ipAddress,
    rememberMe: dto.rememberMe,
  });

  return sanitizeUser(user);
}
