/** Cookie name for the JWT access token */
export const JWT_COOKIE_NAME = 'nexusbid_token';

/** Cookie TTLs in milliseconds */
export const COOKIE_TTL = {
  /** 7 days — regular customer sessions */
  CUSTOMER: 7 * 24 * 60 * 60 * 1000,
  /** 4 hours — admin sessions (shorter for security) */
  ADMIN: 4 * 60 * 60 * 1000,
} as const;

/** JWT expiry strings for jsonwebtoken */
export const JWT_EXPIRY = {
  CUSTOMER: '7d',
  ADMIN: '4h',
} as const;

/** bcrypt cost factors */
export const BCRYPT_ROUNDS = {
  PASSWORD: 12,
  TOKEN: 10,
} as const;

/** Email token TTLs in milliseconds */
export const EMAIL_TOKEN_TTL = {
  VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 30 * 60 * 1000, // 30 minutes
} as const;

/** S3 pre-signed URL expiry in seconds */
export const S3_URL_EXPIRY = {
  UPLOAD: 900, // 15 minutes
  DOWNLOAD: 900, // 15 minutes
} as const;

/** Tender listing defaults */
export const TENDER_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

/** Download rate limiting */
export const DOWNLOAD_RATE_LIMIT = {
  MAX: 10,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour
} as const;
