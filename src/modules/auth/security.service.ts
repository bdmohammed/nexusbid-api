import crypto from 'node:crypto';

import * as bcrypt from 'bcryptjs';

import { AppDataSource } from '../../config/database';
import { env } from '../../config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { PasswordHistory } from '../../database/entities/PasswordHistory';
import { UserDevice } from '../../database/entities/UserDevice';
import { sendLoginNotificationEmail } from '../../services/email.service';

import type { User } from '../../database/entities/User';

const passwordHistoryRepository = AppDataSource.getRepository(PasswordHistory);
const userDeviceRepository = AppDataSource.getRepository(UserDevice);

/**
 * Validates a CAPTCHA response token with Cloudflare Turnstile verification.
 * Fails open if Turnstile service returns non-200, but fails closed on invalid tokens.
 * Skipped in local/test environments or if mock secret is configured.
 */
export async function verifyCaptcha(token: string | undefined): Promise<void> {
  const secretKey = env.TURNSTILE_SECRET_KEY ?? 'mock';

  if (env.NODE_ENV === 'local' || env.NODE_ENV === 'test' || secretKey === 'mock') {
    return;
  }

  if (!token) {
    throw new AppError(
      AppErrorMessage.CAPTCHA_REQUIRED,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.CAPTCHA_REQUIRED,
    );
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      // Fail open on Turnstile outage to prevent system-wide lockouts
      return;
    }

    const turnstileResponse = (await response.json()) as {
      success: boolean;
      [key: string]: unknown;
    };
    if (!turnstileResponse.success) {
      throw new AppError(
        AppErrorMessage.CAPTCHA_FAILED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.CAPTCHA_FAILED,
      );
    }
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    // Fail open on other network/fetch exceptions to preserve login service availability
  }
}

/**
 * Checks if a password has been leaked in a known breach using the k-Anonymity API.
 * Only sends the first 5 characters of the SHA-1 hash to preserve user privacy.
 * Fails open if HaveIBeenPwned API is offline or throws a network error.
 */
export async function verifyPasswordBreach(password: string): Promise<void> {
  if (env.NODE_ENV === 'local' || env.NODE_ENV === 'test') {
    return;
  }

  try {
    const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) {
      return; // Fail open
    }

    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const count = parseInt(countStr ?? '0', 10);
        if (count > 0) {
          throw new AppError(
            AppErrorMessage.PASSWORD_BREACHED,
            HttpStatusCode.BAD_REQUEST,
            AppErrorCode.PASSWORD_BREACHED,
          );
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    // Fail open on network/fetch errors
  }
}

/**
 * Validates that the new password does not match any of the last 5 password hashes.
 */
export async function checkPasswordHistory(userId: string, newPassword: string): Promise<void> {
  const history = await passwordHistoryRepository.find({
    where: { userId },
    order: { createdAt: 'DESC' },
    take: 5,
  });

  for (const entry of history) {
    const isMatch = await bcrypt.compare(newPassword, entry.passwordHash);
    if (isMatch) {
      throw new AppError(
        AppErrorMessage.PASSWORD_REUSED,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.PASSWORD_REUSED,
      );
    }
  }
}

/**
 * Records the new password hash in the user's password history, keeping the log size capped at 5.
 */
export async function savePasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  const entry = passwordHistoryRepository.create({
    userId,
    passwordHash,
  });
  await passwordHistoryRepository.save(entry);

  const history = await passwordHistoryRepository.find({
    where: { userId },
    order: { createdAt: 'DESC' },
  });

  if (history.length > 5) {
    const toDelete = history.slice(5);
    await passwordHistoryRepository.remove(toDelete);
  }
}

/**
 * Computes a secure signature of the user-agent and IP block.
 * Uses a Class-C subnet mask (24-bit for IPv4, 64-bit for IPv6) to allow small IP shifts.
 */
function computeDeviceHash(userAgent: string | null, ipAddress: string | null): string {
  const agent = userAgent ?? '';
  const rawIp = ipAddress ?? '';
  let ipSubnet = rawIp;

  if (rawIp.includes('.')) {
    const parts = rawIp.split('.');
    if (parts.length === 4) {
      ipSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  } else if (rawIp.includes(':')) {
    const parts = rawIp.split(':');
    if (parts.length >= 4) {
      ipSubnet = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}`;
    }
  }

  return crypto.createHash('sha256').update(`${agent}|${ipSubnet}`).digest('hex');
}

/**
 * Checks the login device metadata against recognized devices.
 * If new/suspicious, registers the device, fires a notification email, and returns true.
 * Updates the last login/active timestamps.
 */
export async function trackDeviceAndDetectSuspicious(
  user: User,
  userAgent: string | null,
  ipAddress: string | null,
): Promise<boolean> {
  const deviceHash = computeDeviceHash(userAgent, ipAddress);

  let device = await userDeviceRepository.findOne({
    where: { userId: user.id, deviceHash },
  });

  let isSuspicious = false;

  if (!device) {
    // Check if the user already has devices. If they do, this new device is suspicious.
    const hasDevices = await userDeviceRepository.count({ where: { userId: user.id } });
    if (hasDevices > 0) {
      isSuspicious = true;
    }

    // Register new device
    device = userDeviceRepository.create({
      userId: user.id,
      deviceHash,
      userAgent: userAgent ? userAgent.substring(0, 255) : null,
      lastIpAddress: ipAddress ? ipAddress.substring(0, 45) : null,
      isTrusted: false,
      lastActiveAt: new Date(),
    });
    await userDeviceRepository.save(device);

    // Trigger Login Notification Email
    if (isSuspicious) {
      await sendLoginNotificationEmail({
        to: user.email,
        name: user.name,
        userId: user.id,
        ipAddress,
        userAgent,
        time: new Date(),
      });
    }
  } else {
    // If device is registered, update last active
    device.lastActiveAt = new Date();
    device.lastIpAddress = ipAddress ? ipAddress.substring(0, 45) : null;
    await userDeviceRepository.save(device);
  }

  return isSuspicious;
}
