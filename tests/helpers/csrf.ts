/**
 * tests/helpers/csrf.ts
 *
 * CSRF helper for integration tests.
 *
 * Why we test the REAL CSRF flow (not bypass it in app.ts):
 *   - app.ts currently skips CSRF only for NODE_ENV==='local'.
 *   - In NODE_ENV==='test', CSRF protection is ACTIVE.
 *   - Adding an additional bypass for 'test' would pollute production code
 *     with test-specific logic (Issue #7 / #4 from the plan).
 *   - Instead, each test agent calls GET /csrf-token first, then attaches
 *     both the cookie and the x-csrf-token header on mutating requests.
 *   - This exercises the real security middleware -- zero production pollution.
 *
 * Usage:
 *   const agent = request.agent(app);
 *   const csrf = await getCsrf(agent);
 *   await agent
 *     .post('/api/v1/auth/register')
 *     .set('x-csrf-token', csrf.token)
 *     .send({ ... });
 */
import type { Agent } from 'supertest';

export interface CsrfResult {
  /** Token to send in x-csrf-token header */
  token: string;
  /** Raw Set-Cookie value (supertest agent stores this automatically) */
  cookieHeader: string;
}

/**
 * Fetches a CSRF token from the running app.
 * The supertest agent automatically stores the CSRF cookie for subsequent
 * requests -- you only need to attach the token as a header.
 */
export async function getCsrf(agent: Agent): Promise<CsrfResult> {
  const res = await agent.get('/api/v1/auth/csrf-token').expect(200);

  const token: string = res.body?.data?.csrfToken;
  if (!token) {
    throw new Error(`getCsrf: no csrfToken in response body. Got: ${JSON.stringify(res.body)}`);
  }

  const rawCookie = res.headers['set-cookie'] as string | string[] | undefined;
  const cookieHeader: string = Array.isArray(rawCookie) ? (rawCookie[0] ?? '') : (rawCookie ?? '');

  return { token, cookieHeader };
}


