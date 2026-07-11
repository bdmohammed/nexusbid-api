import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';

import { appDataSource } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../core/AppError';
import { BCRYPT_ROUNDS } from '../../core/constants';
import { User } from '../../entities/User';
import { AccountType } from '../../types/enums';

import { savePasswordToHistory } from './security.service';
import { logSecurityEvent } from './securityLog.service';

const userRepository = appDataSource.getRepository(User);

export interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
}

/**
 * Checks if a provider has client ID and secret configured.
 */
function isConfigured(provider: string): boolean {
  if (env.NODE_ENV === 'test') {
    return false; // Force mock mode in test environment
  }
  switch (provider) {
    case 'google':
      return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
    case 'github':
      return !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
    case 'microsoft':
      return !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
    default:
      return false;
  }
}

/**
 * Gets the authorization endpoint URL for the given provider.
 * Falls back to mock callback redirect URL if credentials are not configured.
 */
export function getAuthorizationUrl(provider: string, state: string): string {
  const redirectUri = `${env.API_URL}/api/v1/auth/oauth/${provider}/callback`;

  if (!isConfigured(provider)) {
    // Return direct redirect to our callback with mock parameters
    return `${redirectUri}?code=mock_code_${provider}_${crypto.randomBytes(4).toString('hex')}&state=${state}`;
  }

  switch (provider) {
    case 'google':
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      }).toString()}`;

    case 'github':
      return `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID!,
        redirect_uri: redirectUri,
        scope: 'user:email',
        state,
      }).toString()}`;

    case 'microsoft':
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile User.Read',
        state,
      }).toString()}`;

    default:
      throw new AppError('Invalid OAuth provider', 400, 'INVALID_PROVIDER');
  }
}

/**
 * Verifies code callback and fetches user profile from the provider.
 */
export async function verifyCallbackAndGetUser(
  provider: string,
  code: string,
): Promise<OAuthProfile> {
  // Check if this is a mock request (starts with mock_code_ or provider credentials missing)
  if (code.startsWith('mock_code_') ?? !isConfigured(provider)) {
    return {
      providerId: `${provider}-mock-${crypto.randomBytes(6).toString('hex')}`,
      email: `mock.${provider}@example.com`,
      name: `Mock ${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
    };
  }

  const redirectUri = `${env.API_URL}/api/v1/auth/oauth/${provider}/callback`;

  try {
    if (provider === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
      }
      const tokenData: any = await tokenRes.json();

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        throw new Error(`Google userinfo fetch failed: ${await profileRes.text()}`);
      }
      const profile: any = await profileRes.json();

      return {
        providerId: profile.sub,
        email: profile.email,
        name: profile.name,
      };
    }

    if (provider === 'github') {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: env.GITHUB_CLIENT_ID!,
          client_secret: env.GITHUB_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`GitHub token exchange failed: ${await tokenRes.text()}`);
      }
      const tokenData: any = await tokenRes.json();

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'NexusBid',
        },
      });

      if (!userRes.ok) {
        throw new Error(`GitHub user fetch failed: ${await userRes.text()}`);
      }
      const userData: any = await userRes.json();

      // Retrieve primary/verified email
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'NexusBid',
        },
      });

      let { email } = userData;
      if (emailsRes.ok) {
        const emails: any[] = (await emailsRes.json()) as any;
        const primaryEmail =
          emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }

      if (!email) {
        throw new Error('No verified email associated with this GitHub account.');
      }

      return {
        providerId: String(userData.id),
        email,
        name: userData.name ?? userData.login,
      };
    }

    if (provider === 'microsoft') {
      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.MICROSOFT_CLIENT_ID!,
          client_secret: env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Microsoft token exchange failed: ${await tokenRes.text()}`);
      }
      const tokenData: any = await tokenRes.json();

      const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        throw new Error(`Microsoft Graph profile fetch failed: ${await profileRes.text()}`);
      }
      const profile: any = await profileRes.json();

      return {
        providerId: profile.id,
        email: profile.mail ?? profile.userPrincipalName,
        name: profile.displayName ?? profile.givenName ?? 'Microsoft User',
      };
    }

    throw new AppError('Invalid OAuth provider', 400, 'INVALID_PROVIDER');
  } catch (error: any) {
    logger.error({ err: error, provider }, 'OAuth callback verification failure');
    throw new AppError(
      `OAuth login failed with provider ${provider}: ${error.message}`,
      401,
      'OAUTH_VERIFICATION_FAILED',
    );
  }
}

/**
 * Handles account lookup, auto-linking, or auto-registration.
 */
export async function authenticateOAuthUser(
  provider: string,
  profile: OAuthProfile,
  clientMetadata?: { userAgent: string | null; ipAddress: string | null },
): Promise<User> {
  // 1. Query by provider ID
  let user: User | null = null;
  if (provider === 'google') {
    user = await userRepository.findOne({ where: { googleId: profile.providerId } });
  } else if (provider === 'github') {
    user = await userRepository.findOne({ where: { githubId: profile.providerId } });
  } else if (provider === 'microsoft') {
    user = await userRepository.findOne({ where: { microsoftId: profile.providerId } });
  }

  if (user) {
    if (user.isBlocked) {
      throw new AppError('Account suspended. Contact support.', 403, 'ACCOUNT_BLOCKED');
    }
    // Update last login
    user.lastLoginAt = new Date();
    await userRepository.save(user);

    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: 'login.success',
      ipAddress: clientMetadata?.ipAddress ?? null,
      userAgent: clientMetadata?.userAgent ?? null,
      details: { method: `oauth_${provider}` },
    });

    return user;
  }

  // 2. Query by Email (Auto-linking)
  user = await userRepository.findOne({
    where: { email: profile.email },
  });

  if (user) {
    if (user.isBlocked) {
      throw new AppError('Account suspended. Contact support.', 403, 'ACCOUNT_BLOCKED');
    }

    // Link provider account
    if (provider === 'google') {
      user.googleId = profile.providerId;
    } else if (provider === 'github') {
      user.githubId = profile.providerId;
    } else if (provider === 'microsoft') {
      user.microsoftId = profile.providerId;
    }

    // Auto-verify email if it wasn't already
    if (!user.emailVerified) {
      user.emailVerified = true;
    }
    user.lastLoginAt = new Date();
    await userRepository.save(user);

    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      event: 'login.success',
      ipAddress: clientMetadata?.ipAddress ?? null,
      userAgent: clientMetadata?.userAgent ?? null,
      details: { method: `oauth_${provider}`, action: 'linked' },
    });

    return user;
  }

  // 3. Register a new user (Auto-registration)
  // Generate random, high-entropy password since they log in via OAuth
  const temporaryPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS.PASSWORD);

  const newUserDto: Partial<User> = {
    name: profile.name,
    email: profile.email,
    passwordHash,
    emailVerified: true, // OAuth emails are pre-verified by provider
    accountType: AccountType.USER,
    passwordChangedAt: new Date(),
    lastLoginAt: new Date(),
  };

  if (provider === 'google') {
    newUserDto.googleId = profile.providerId;
  } else if (provider === 'github') {
    newUserDto.githubId = profile.providerId;
  } else if (provider === 'microsoft') {
    newUserDto.microsoftId = profile.providerId;
  }

  user = userRepository.create(newUserDto);

  await userRepository.save(user);

  // Save the password to history
  await savePasswordToHistory(user.id, passwordHash);

  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: 'register.success',
    ipAddress: clientMetadata?.ipAddress ?? null,
    userAgent: clientMetadata?.userAgent ?? null,
    details: { method: `oauth_${provider}` },
  });

  await logSecurityEvent({
    userId: user.id,
    email: user.email,
    event: 'login.success',
    ipAddress: clientMetadata?.ipAddress ?? null,
    userAgent: clientMetadata?.userAgent ?? null,
    details: { method: `oauth_${provider}` },
  });

  return user;
}
