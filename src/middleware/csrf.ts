import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env';

/**
 * CSRF protection using the double-submit cookie pattern (csrf-csrf library).
 *
 * How it works:
 *   1. Client calls GET /api/v1/auth/csrf-token
 *   2. Server sets a signed CSRF cookie AND returns the token in the response body
 *   3. Client sends token as 'x-csrf-token' header on every state-changing request
 *   4. Server verifies the header matches the cookie
 *
 * EXCLUDED from CSRF:
 *   - GET, HEAD, OPTIONS requests (safe methods)
 *   - /api/v1/webhooks/* (PayPal cannot send CSRF tokens)
 *
 * Applied globally in app.ts with a path-based skip.
 */
export const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat' ? '__Host-nexusbid.csrf' : 'nexusbid.csrf',
  cookieOptions: {
    sameSite: 'lax',
    secure: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat',
    httpOnly: true,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});
