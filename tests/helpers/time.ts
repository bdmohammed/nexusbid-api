/**
 * tests/helpers/time.ts
 *
 * Fake time helpers for testing token expiry (Issue #12).
 *
 * Why fake timers?
 *   - Password reset tokens expire in 30 minutes.
 *   - Email verification tokens expire in 24 hours.
 *   - Actually waiting for these durations in tests is unacceptable.
 *   - jest.useFakeTimers() intercepts Date, setTimeout, setInterval etc.
 *     so we can advance the clock instantly.
 *
 * IMPORTANT: withFakeTime() always restores real timers, even on failure.
 * This prevents fake timers from leaking into other tests and causing
 * mysterious timing-related failures.
 *
 * Usage:
 *   await withFakeTime(31 * 60 * 1000, async () => {
 *     // Clock is 31 minutes in the future inside this callback
 *     const res = await agent.post('/api/v1/auth/reset-password').send({ token, password });
 *     expect(res.status).toBe(400);
 *   });
 */

/**
 * Runs `fn` with the system clock advanced by `advanceMs` milliseconds.
 * Always restores real timers after `fn` completes (or throws).
 *
 * @param advanceMs - Milliseconds to advance the clock (e.g., 31 * 60 * 1000)
 * @param fn        - Async test body to run with the advanced clock
 */
export async function withFakeTime(
  advanceMs: number,
  fn: () => Promise<void>,
): Promise<void> {
  const realNow = Date.now();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(realNow + advanceMs));
  try {
    await fn();
  } finally {
    jest.useRealTimers();
  }
}
