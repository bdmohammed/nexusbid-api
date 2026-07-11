import rateLimit from 'express-rate-limit';

/**
 * NOTE: Per-worker rate limiting (no Redis).
 * In PM2 cluster mode, each worker maintains independent counters.
 * At low traffic this is acceptable. Add `rate-limit-redis` in Phase 1 scaling.
 * Example: with 4 workers, the effective limit is 4× the configured value per IP.
 */

const standardHeaders = true; // Return rate limit headers (RateLimit-*)
const legacyHeaders = false;

/** Login: 10 requests per IP per minute */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many login attempts. Try again in 1 minute.',
  },
});

/** Registration: 5 requests per IP per hour */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many registration attempts. Try again in 1 hour.',
  },
});

/** Password reset: 5 requests per IP per hour */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many password reset attempts. Try again in 1 hour.',
  },
});

/** Resend email verification: 3 requests per IP per 15 minutes */
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many verification link requests. Try again in 15 minutes.',
  },
});

/** Contact form: 3 requests per IP per hour */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders,
  legacyHeaders,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many contact form submissions. Try again later.',
  },
});

/**
 * Download URL generation: 10 per user per hour.
 * Applied per-user via keyGenerator on authenticated route.
 */
export const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders,
  legacyHeaders,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Download limit reached. Try again in 1 hour.',
  },
});

/** Global API limit: 300 requests per IP per 15 minutes */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders,
  legacyHeaders,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' },
});
