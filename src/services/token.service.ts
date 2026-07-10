import crypto from 'crypto';
import { IsNull, MoreThan } from 'typeorm';
import { appDataSource } from '../config/database';
import { EmailToken } from '../entities/EmailToken';
import { User } from '../entities/User';
import { AppError } from '../core/AppError';
import { EMAIL_TOKEN_TTL } from '../core/constants';
import { EmailTokenType } from '../types/enums';

const emailTokenRepository = appDataSource.getRepository(EmailToken);

/**
 * Creates a new email token for the given user and type.
 *
 * Returns the RAW token (plain text) — this is sent in the email link.
 * The SHA-256 HASH is stored in the database. Never store or return the raw token in the DB.
 *
 * Single-use: tokens are marked usedAt on consumption.
 */
export async function createEmailToken(
  userId: string,
  type: EmailTokenType,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const ttl =
    type === EmailTokenType.PASSWORD_RESET || type === EmailTokenType.SYSTEM_OWNER_APPROVAL
      ? EMAIL_TOKEN_TTL.PASSWORD_RESET
      : EMAIL_TOKEN_TTL.VERIFICATION;

  const token = emailTokenRepository.create({
    userId,
    tokenHash,
    type,
    expiresAt: new Date(Date.now() + ttl),
  });

  await emailTokenRepository.save(token);
  return rawToken;
}

/**
 * Verifies a raw token against the DB hash and marks it as used.
 * Throws AppError if the token is invalid, expired, or already used.
 *
 * For password reset: deletes ALL password_reset tokens for the user after success.
 */
export async function verifyAndConsumeToken(
  rawToken: string,
  type: EmailTokenType,
): Promise<string> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Find the exact non-expired, non-used token of this type matching the hash
  const matched = await emailTokenRepository.findOne({
    where: {
      tokenHash,
      type,
      usedAt: IsNull() as unknown as Date,
      expiresAt: MoreThan(new Date()),
    },
  });

  if (!matched) {
    throw new AppError(
      'Invalid or expired token',
      400,
      'INVALID_TOKEN',
    );
  }

  // Mark as used
  await emailTokenRepository.update(matched.id, { usedAt: new Date() });

  // For password reset — delete all reset tokens for this user
  if (type === EmailTokenType.PASSWORD_RESET) {
    await emailTokenRepository.delete({ userId: matched.userId, type });
  }

  return matched.userId;
}

/**
 * Deletes all tokens of a given type for a user.
 * Called after successful password reset to prevent token reuse.
 */
export async function deleteTokensByType(
  userId: string,
  type: EmailTokenType,
): Promise<void> {
  await emailTokenRepository.delete({ userId, type });
}

/**
 * Retrieves details for a valid, non-expired, non-used token along with the user relations.
 */
export async function getValidTokenDetails(
  rawToken: string,
  type: EmailTokenType,
): Promise<EmailToken & { user: User }> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const matched = await emailTokenRepository.findOne({
    where: {
      tokenHash,
      type,
      usedAt: IsNull() as unknown as Date,
      expiresAt: MoreThan(new Date()),
    },
    relations: ['user'],
  });

  if (!matched || !matched.user) {
    throw new AppError('Invalid or expired token', 400, 'INVALID_TOKEN');
  }

  return matched as EmailToken & { user: User };
}


