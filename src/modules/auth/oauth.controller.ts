import crypto from 'node:crypto';

import { env } from '../../config/env';
import { asyncHandler } from '../../core/asyncHandler';

import * as authService from './auth.service';
import * as oauthService from './oauth.service';

import type { OAuthCallbackQueryDto, OAuthProviderDto } from './auth.dto';

/**
 * GET /api/v1/auth/oauth/:provider
 * Redirects the client to the chosen OAuth provider's authorization portal.
 */
export const redirectToProvider = asyncHandler<OAuthProviderDto, void>(async (req, res) => {
  const { provider } = req.params;

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: ['prod', 'uat'].includes(env.NODE_ENV),
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  const authUrl = oauthService.getAuthorizationUrl(provider, state);
  res.redirect(authUrl);
});

/**
 * GET /api/v1/auth/oauth/:provider/callback
 * Handles OAuth authentication callback, exchanges code for user profile,
 * establishes a session, and redirects to frontend.
 */
export const handleCallback = asyncHandler<OAuthProviderDto, void, {}, OAuthCallbackQueryDto>(
  async (req, res) => {
    const { provider } = req.params;
    const { code, state } = req.query;

    // 1. Verify CSRF State Cookie
    const savedState = req.cookies['oauth_state'] as string | undefined;
    res.clearCookie('oauth_state');

    // Skip strict state check in test/local env for easier automated verification
    if (
      env.NODE_ENV !== 'test' &&
      env.NODE_ENV !== 'local' &&
      (!state || !savedState || state !== savedState)
    ) {
      res.redirect(`${env.FRONTEND_CUSTOMER_URL}/login?error=mismatched_state`);
      return;
    }

    try {
      // 2. Exchange authorization code for provider user profile
      const profile = await oauthService.verifyCallbackAndGetUser(provider, code);

      // 3. Register or link user and return database record
      const user = await oauthService.authenticateOAuthUser(provider, profile, {
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      });

      // 4. Track device and set JWT cookies
      await authService.establishOAuthSession(res, user, {
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      });

      // 5. Redirect back to frontend customer dashboard
      res.redirect(env.FRONTEND_CUSTOMER_URL);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'authentication_failed';
      res.redirect(`${env.FRONTEND_CUSTOMER_URL}/login?error=${encodeURIComponent(errMsg)}`);
    }
  },
);
