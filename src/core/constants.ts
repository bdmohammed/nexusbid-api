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

/** Supported US states / territories — used for seeding */
export const US_STATES = [
  { code: 'AL', name: 'Alabama', slug: 'alabama', type: 'state' },
  { code: 'AK', name: 'Alaska', slug: 'alaska', type: 'state' },
  { code: 'AZ', name: 'Arizona', slug: 'arizona', type: 'state' },
  { code: 'AR', name: 'Arkansas', slug: 'arkansas', type: 'state' },
  { code: 'CA', name: 'California', slug: 'california', type: 'state' },
  { code: 'CO', name: 'Colorado', slug: 'colorado', type: 'state' },
  { code: 'CT', name: 'Connecticut', slug: 'connecticut', type: 'state' },
  { code: 'DE', name: 'Delaware', slug: 'delaware', type: 'state' },
  { code: 'FL', name: 'Florida', slug: 'florida', type: 'state' },
  { code: 'GA', name: 'Georgia', slug: 'georgia', type: 'state' },
  { code: 'HI', name: 'Hawaii', slug: 'hawaii', type: 'state' },
  { code: 'ID', name: 'Idaho', slug: 'idaho', type: 'state' },
  { code: 'IL', name: 'Illinois', slug: 'illinois', type: 'state' },
  { code: 'IN', name: 'Indiana', slug: 'indiana', type: 'state' },
  { code: 'IA', name: 'Iowa', slug: 'iowa', type: 'state' },
  { code: 'KS', name: 'Kansas', slug: 'kansas', type: 'state' },
  { code: 'KY', name: 'Kentucky', slug: 'kentucky', type: 'state' },
  { code: 'LA', name: 'Louisiana', slug: 'louisiana', type: 'state' },
  { code: 'ME', name: 'Maine', slug: 'maine', type: 'state' },
  { code: 'MD', name: 'Maryland', slug: 'maryland', type: 'state' },
  { code: 'MA', name: 'Massachusetts', slug: 'massachusetts', type: 'state' },
  { code: 'MI', name: 'Michigan', slug: 'michigan', type: 'state' },
  { code: 'MN', name: 'Minnesota', slug: 'minnesota', type: 'state' },
  { code: 'MS', name: 'Mississippi', slug: 'mississippi', type: 'state' },
  { code: 'MO', name: 'Missouri', slug: 'missouri', type: 'state' },
  { code: 'MT', name: 'Montana', slug: 'montana', type: 'state' },
  { code: 'NE', name: 'Nebraska', slug: 'nebraska', type: 'state' },
  { code: 'NV', name: 'Nevada', slug: 'nevada', type: 'state' },
  { code: 'NH', name: 'New Hampshire', slug: 'new-hampshire', type: 'state' },
  { code: 'NJ', name: 'New Jersey', slug: 'new-jersey', type: 'state' },
  { code: 'NM', name: 'New Mexico', slug: 'new-mexico', type: 'state' },
  { code: 'NY', name: 'New York', slug: 'new-york', type: 'state' },
  { code: 'NC', name: 'North Carolina', slug: 'north-carolina', type: 'state' },
  { code: 'ND', name: 'North Dakota', slug: 'north-dakota', type: 'state' },
  { code: 'OH', name: 'Ohio', slug: 'ohio', type: 'state' },
  { code: 'OK', name: 'Oklahoma', slug: 'oklahoma', type: 'state' },
  { code: 'OR', name: 'Oregon', slug: 'oregon', type: 'state' },
  { code: 'PA', name: 'Pennsylvania', slug: 'pennsylvania', type: 'state' },
  { code: 'RI', name: 'Rhode Island', slug: 'rhode-island', type: 'state' },
  { code: 'SC', name: 'South Carolina', slug: 'south-carolina', type: 'state' },
  { code: 'SD', name: 'South Dakota', slug: 'south-dakota', type: 'state' },
  { code: 'TN', name: 'Tennessee', slug: 'tennessee', type: 'state' },
  { code: 'TX', name: 'Texas', slug: 'texas', type: 'state' },
  { code: 'UT', name: 'Utah', slug: 'utah', type: 'state' },
  { code: 'VT', name: 'Vermont', slug: 'vermont', type: 'state' },
  { code: 'VA', name: 'Virginia', slug: 'virginia', type: 'state' },
  { code: 'WA', name: 'Washington', slug: 'washington', type: 'state' },
  { code: 'WV', name: 'West Virginia', slug: 'west-virginia', type: 'state' },
  { code: 'WI', name: 'Wisconsin', slug: 'wisconsin', type: 'state' },
  { code: 'WY', name: 'Wyoming', slug: 'wyoming', type: 'state' },
  { code: 'DC', name: 'District of Columbia', slug: 'district-of-columbia', type: 'territory' },
  { code: 'PR', name: 'Puerto Rico', slug: 'puerto-rico', type: 'territory' },
  { code: 'GU', name: 'Guam', slug: 'guam', type: 'territory' },
  { code: 'VI', name: 'U.S. Virgin Islands', slug: 'us-virgin-islands', type: 'territory' },
  { code: 'US-FED', name: 'Federal (SAM.gov)', slug: 'federal', type: 'federal' },
] as const;
