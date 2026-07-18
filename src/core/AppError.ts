export enum HttpStatusCode {
  // 1xx Informational
  CONTINUE = 100,
  SWITCHING_PROTOCOLS = 101,
  PROCESSING = 102,
  EARLY_HINTS = 103,

  // 2xx Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NON_AUTHORITATIVE_INFORMATION = 203,
  NO_CONTENT = 204,
  RESET_CONTENT = 205,
  PARTIAL_CONTENT = 206,
  MULTI_STATUS = 207,
  ALREADY_REPORTED = 208,
  IM_USED = 226,

  // 3xx Redirection
  MULTIPLE_CHOICES = 300,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  USE_PROXY = 305,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,

  // 4xx Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  LENGTH_REQUIRED = 411,
  PRECONDITION_FAILED = 412,
  PAYLOAD_TOO_LARGE = 413,
  URI_TOO_LONG = 414,
  UNSUPPORTED_MEDIA_TYPE = 415,
  RANGE_NOT_SATISFIABLE = 416,
  EXPECTATION_FAILED = 417,
  IM_A_TEAPOT = 418,
  MISDIRECTED_REQUEST = 421,
  UNPROCESSABLE_ENTITY = 422,
  LOCKED = 423,
  FAILED_DEPENDENCY = 424,
  TOO_EARLY = 425,
  UPGRADE_REQUIRED = 426,
  PRECONDITION_REQUIRED = 428,
  TOO_MANY_REQUESTS = 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
  VARIANT_ALSO_NEGOTIATES = 506,
  INSUFFICIENT_STORAGE = 507,
  LOOP_DETECTED = 508,
  NOT_EXTENDED = 510,
  NETWORK_AUTHENTICATION_REQUIRED = 511,
}

export enum AppErrorCode {
  ACCESS_DENIED = 'ACCESS_DENIED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ALREADY_REVIEWED = 'ALREADY_REVIEWED',
  ALREADY_SUBSCRIBED = 'ALREADY_SUBSCRIBED',
  BAD_REQUEST = 'BAD_REQUEST',
  BATCH_SIZE_EXCEEDED = 'BATCH_SIZE_EXCEEDED',
  BOOTSTRAP_DISABLED = 'BOOTSTRAP_DISABLED',
  CAPTCHA_FAILED = 'CAPTCHA_FAILED',
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  CATEGORIES_REQUIRED = 'CATEGORIES_REQUIRED',
  CATEGORY_CODE_TAKEN = 'CATEGORY_CODE_TAKEN',
  CATEGORY_HAS_TENDERS = 'CATEGORY_HAS_TENDERS',
  CATEGORY_REQUIRED = 'CATEGORY_REQUIRED',
  CATEGORY_SLUG_CONFLICT = 'CATEGORY_SLUG_CONFLICT',
  CATEGORY_SLUG_TAKEN = 'CATEGORY_SLUG_TAKEN',
  COMMENT_REQUIRED = 'COMMENT_REQUIRED',
  CONCURRENCY_CONFLICT = 'CONCURRENCY_CONFLICT',
  COUNTRY_REQUIRED = 'COUNTRY_REQUIRED',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  COUPON_FIRST_PURCHASE_ONLY = 'COUPON_FIRST_PURCHASE_ONLY',
  COUPON_LIMIT_REACHED = 'COUPON_LIMIT_REACHED',
  COUPON_MIN_PURCHASE_NOT_MET = 'COUPON_MIN_PURCHASE_NOT_MET',
  COUPON_NOT_FOUND = 'COUPON_NOT_FOUND',
  COUPON_NOT_YET_ACTIVE = 'COUPON_NOT_YET_ACTIVE',
  COUPON_PLAN_RESTRICTED = 'COUPON_PLAN_RESTRICTED',
  COUPON_USER_LIMIT_REACHED = 'COUPON_USER_LIMIT_REACHED',
  CREATOR_APPROVAL_BLOCKED = 'CREATOR_APPROVAL_BLOCKED',
  CSV_PARSE_FAILED = 'CSV_PARSE_FAILED',
  DRAFT_EXISTS = 'DRAFT_EXISTS',
  DRAFT_LOCKED = 'DRAFT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  EMPTY_BATCH = 'EMPTY_BATCH',
  FORBIDDEN = 'FORBIDDEN',
  FORCED_PASSWORD_RESET = 'FORCED_PASSWORD_RESET',
  INCORRECT_CURRENT_PASSWORD = 'INCORRECT_CURRENT_PASSWORD',
  INVALID_ACCOUNT_TYPE = 'INVALID_ACCOUNT_TYPE',
  INVALID_BATCH_BODY = 'INVALID_BATCH_BODY',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  INVALID_STATE = 'INVALID_STATE',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  LAST_SUPER_ADMIN_PROTECTION = 'LAST_SUPER_ADMIN_PROTECTION',
  MAX_CATEGORIES_EXCEEDED = 'MAX_CATEGORIES_EXCEEDED',
  NOT_APPROVED = 'NOT_APPROVED',
  NOT_FOUND = 'NOT_FOUND',
  NO_ACTIVE_VERSION = 'NO_ACTIVE_VERSION',
  NO_EMAIL_CHANGE_REQUEST = 'NO_EMAIL_CHANGE_REQUEST',
  OAUTH_VERIFICATION_FAILED = 'OAUTH_VERIFICATION_FAILED',
  PASSWORD_BREACHED = 'PASSWORD_BREACHED',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  PASSWORD_REUSED = 'PASSWORD_REUSED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PERMISSION_LOAD_FAILED = 'PERMISSION_LOAD_FAILED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_REQUIRED = 'REFRESH_TOKEN_REQUIRED',
  REJECTED = 'REJECTED',
  REPLAY_DETECTED = 'REPLAY_DETECTED',
  REVOCATION_REJECTED = 'REVOCATION_REJECTED',
  ROLE_ALREADY_EXISTS = 'ROLE_ALREADY_EXISTS',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  SELF_MODIFICATION_FORBIDDEN = 'SELF_MODIFICATION_FORBIDDEN',
  SELF_REVIEW_FORBIDDEN = 'SELF_REVIEW_FORBIDDEN',
  SESSION_REVOKED = 'SESSION_REVOKED',
  STATE_REQUIRED = 'STATE_REQUIRED',
  SYSTEM_ROLE_PROTECTED = 'SYSTEM_ROLE_PROTECTED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNAUTHORIZED_REVIEWER = 'UNAUTHORIZED_REVIEWER',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

export const AppErrorMessage = {
  INVALID_INPUT: 'INVALID_INPUT',
  // --- Auth & Session ---
  ACCESS_TOKEN_EXPIRED: 'Access token expired',
  ACCOUNT_NOT_DEACTIVATED: 'Account is not deactivated',
  ACCOUNT_NOT_FOUND: 'Account not found',
  // Used in authenticate middleware for active JWT session checks
  ACCOUNT_SUSPENDED: 'Account suspended',
  // Used in customer login flows
  ACCOUNT_SUSPENDED_CONTACT_SUPPORT: 'Account suspended. Contact support.',
  // Used in admin login flows
  ACCOUNT_SUSPENDED_CONTACT_ADMIN:
    'Your account has been suspended. Contact the system administrator.',
  AUTHENTICATION_REQUIRED: 'Authentication required',
  CAPTCHA_FAILED: 'CAPTCHA verification failed. Please try again.',
  CAPTCHA_REQUIRED: 'CAPTCHA verification is required',
  CAPTCHA_VERIFICATION_REQUIRED: 'CAPTCHA verification required',
  EMAIL_IN_USE: 'Email already in use',
  EMAIL_REGISTERED: 'Email already registered',
  INCORRECT_CURRENT_PASSWORD: 'Incorrect current password',
  INVALID_OAUTH_PROVIDER: 'Invalid OAuth provider',
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  PASSWORD_REUSED: 'New password cannot be one of your recently used passwords',
  VERIFY_EMAIL_BEFORE_LOGIN: 'Please verify your email address before logging in',
  REFRESH_TOKEN_REUSE_DETECTED:
    'Potential refresh token reuse detected. All sessions revoked for safety.',
  REFRESH_TOKEN_EXPIRED: 'Refresh token expired',
  REFRESH_TOKEN_REQUIRED: 'Refresh token required',
  SESSION_EXPIRED_OR_INVALID: 'Session expired or invalid',
  SESSION_HAS_BEEN_REVOKED: 'Session has been revoked',
  SESSION_NOT_FOUND: 'Session not found',
  PASSWORD_BREACHED:
    'This password has been exposed in a data breach. Please choose a different password.',
  TOKEN_REQUIRED: 'Token is required',
  UNAUTHORIZED: 'Unauthorized',
  // Used in token refresh context
  USER_NOT_FOUND_OR_SUSPENDED: 'User not found or suspended',
  USER_NOT_FOUND: 'User not found',
  USER_NOT_LOGGED_IN: 'User not logged in',
  VALID_TOKEN_AND_ACTION_REQUIRED: 'Valid token and action are required',
  PASSWORD_RESET_REQUIRED: 'You must reset your password before continuing.',
  ADMIN_ACCOUNT_AWAITING_APPROVAL: 'Your administrator account is awaiting approval.',
  ADMIN_ACCOUNT_REJECTED: 'Your administrator account request has been rejected.',
  PASSWORD_EXPIRED: 'Your password has expired and must be changed.',
  NO_EMAIL_CHANGE_REQUEST: 'No email change request found',
  DEVICE_NOT_FOUND: 'Device not found',

  // --- RBAC & Roles ---
  COMMENT_REQUIRED: 'A comment/rationale is required when rejecting or requesting changes.',
  ROLE_PERMISSION_REQUIRED: 'A role must have at least one permission assigned.',
  ACCESS_DENIED_PRIVILEGE: 'Access Denied: Insufficient privilege to execute action.',
  ADMIN_ROLE_MUTATION_REJECTED:
    'An administrator must have at least one role assigned. Mutation rejected.',
  ADMIN_ROLE_REVOCATION_REJECTED:
    'An administrator must have at least one role assigned. Revocation rejected.',
  REVIEWER_REQUIRED: 'At least one reviewer must be assigned.',
  BOOTSTRAP_DISABLED: 'Bootstrap is disabled because a Super Admin already exists.',
  CREATOR_REVIEWER_BLOCKED: 'Creator/Submitter cannot be assigned as a reviewer.',
  PERMISSIONS_LOAD_FAILED: 'Failed to load authorization permissions',
  FORBIDDEN_ACCESS_DENIED: 'Forbidden: Access Denied',
  FORBIDDEN_REVOKE_LAST_SUPER_ADMIN:
    'Forbidden: Cannot revoke Super Admin role from the last active Super Admin.',
  FORBIDDEN_INSUFFICIENT_PERMISSIONS: 'Forbidden: Insufficient Permissions',
  FORBIDDEN_SUPER_ADMIN_REQUIRED: 'Forbidden: Super Admin Access Required',
  PERMISSIONS_NOT_IN_REGISTRY: 'None of the assigned permissions exist in the registry.',
  ROLE_INVALID_OR_INACTIVE: 'One or more assigned roles are invalid or inactive.',
  ROLES_ASSIGNED_INVALID_OR_INACTIVE: 'One or more roles being assigned are invalid or inactive.',
  ONLY_ADMIN_APPROVED: 'Only administrator accounts can be approved',
  ONLY_ADMIN_REJECTED: 'Only administrator accounts can be rejected',
  ONLY_DRAFT_ROLES_REVIEWED: 'Only draft versions can be submitted for review',
  ROLE_ID_REQUIRED: 'Role ID is required for approval',
  ROLE_ASSIGNMENT_NOT_FOUND: 'Role assignment not found',
  ROLE_NAME_REQUIRED: 'Role name is required',
  ROLE_NOT_FOUND: 'Role not found',
  ROLE_REVIEW_WORKFLOW_NOT_FOUND: 'Role review workflow not found',
  ROLE_VERSION_NOT_FOUND: 'Role version not found',
  ROLES_ASSIGNED_TO_ADMIN_ONLY: 'Roles can only be assigned to administrator accounts.',
  ROLES_MANAGED_FOR_ADMIN_ONLY: 'Roles can only be managed for administrator accounts.',
  ROLE_SELF_MODIFICATION_FORBIDDEN:
    'Self-modification of roles is forbidden to prevent self-lockout.',
  SYSTEM_ROLES_PROTECTED: 'System roles cannot be archived or deleted.',
  SYSTEM_ROLES_READONLY: 'System roles cannot be modified.',
  ROLE_DRAFT_LOCKED: 'This role draft is currently locked by another administrator.',
  NOT_ASSIGNED_ROLE_REVIEWER: 'You are not assigned as a reviewer for this role.',
  DRAFT_UNLOCK_FORBIDDEN: 'You cannot unlock a draft locked by someone else.',
  REJECTION_REASON_REQUIRED: 'Rejection reason is required',

  // --- Tenders & Documents ---
  TENDER_CONFLICT_MODIFIED: 'Conflict: Tender was modified by another user',
  DOCUMENT_NOT_FOUND: 'Document not found',
  FILE_NOT_FOUND_OR_EXPIRED: 'File not found or link has expired',
  ONLY_PDF_ALLOWED: 'Only PDF files are allowed',
  TENDER_ACTIVE_VERSION_NOT_FOUND: 'Tender active version not found',
  TENDER_NOT_FOUND: 'Tender not found',
  QUESTION_NOT_FOUND: 'Question not found',

  // --- Coupons & Subscriptions ---
  PLAN_DRAFT_EXISTS: 'A draft or review version already exists for this plan',
  ACCESS_DENIED_SUBSCRIPTION: 'Access denied: Active subscription or purchase required',
  COUPON_EXPIRED: 'Coupon has expired',
  COUPON_INVALID_PLAN: 'Coupon is not valid for this plan',
  COUPON_NOT_ACTIVE: 'Coupon is not yet active',
  COUPON_FIRST_PURCHASE_ONLY: 'Coupon is only valid for first-time purchases',
  COUPON_NOT_FOUND_OR_INACTIVE: 'Coupon not found or inactive',
  COUPON_NOT_FOUND: 'Coupon not found',
  COUPON_USER_LIMIT_REACHED: 'Coupon usage limit reached for this user',
  COUPON_LIMIT_REACHED: 'Coupon usage limit reached',
  NO_ACTIVE_SUBSCRIPTION: 'No active subscription found',
  NO_ACTIVE_VERSION: 'No active version found',
  COUPON_MIN_AMOUNT_NOT_MET: 'Minimum purchase amount not met for coupon',
  ONLY_APPROVED_PLANS_PUBLISHED: 'Only approved plan versions can be published',
  ONLY_DRAFT_PLANS_REVIEWED: 'Only draft versions can be submitted for review',
  PLAN_NOT_FOUND_OR_INACTIVE: 'Plan not found or inactive',
  PLAN_NOT_FOUND: 'Plan not found',
  REVIEW_NOT_FOUND: 'Review not found',
  REVIEW_SESSION_NOT_FOUND: 'Review session not found',
  REVIEW_WORKFLOW_NOT_FOUND: 'Review workflow not found',
  REVIEWERS_SELF_REVIEW_BLOCKED: 'Reviewers cannot review or approve their own plan modifications',
  SUBSCRIPTIONS_CUSTOMERS_ONLY: 'Subscriptions only apply to customer accounts',
  REVIEW_WORKFLOW_ALREADY_COMPLETED: 'This review workflow is already completed.',
  SUBSCRIPTION_ALREADY_ACTIVE: 'You already have an active subscription',
  NOT_ASSIGNED_PLAN_REVIEWER: 'You are not assigned to review this plan version',
  REVIEW_ALREADY_SUBMITTED: 'You have already submitted your review decision.',

  // --- Categories & Geography ---
  CATEGORY_DELETE_ASSOCIATED_TENDERS: 'Cannot delete category with associated active tenders',
  CATEGORY_CODE_EXISTS: 'Category code already exists',
  CATEGORY_NOT_FOUND: 'Category not found',
  CATEGORY_SELECTION_REQUIRED: 'Category selection required for category-specific plan',
  CATEGORY_SELECTIONS_REQUIRED: 'Category selections required for custom bundle plan',
  CATEGORY_SLUG_EXISTS: 'Category slug already exists',
  COUNTRY_NOT_FOUND: 'Country not found',
  COUNTRY_SELECTION_REQUIRED: 'Country selection required for country-specific plan',
  STATE_NOT_FOUND: 'State not found',
  STATE_SELECTION_REQUIRED: 'State selection required for state-specific plan',

  // --- System & Utilities ---
  ACTION_NOT_FOUND: 'Action not found',
  ALERT_NOT_FOUND: 'Alert not found',
  AUDIT_RECORD_NOT_FOUND: 'Audit record not found',
  DRAFT_LOCKED_ADMIN: 'Draft is locked by another admin.',
  CSV_EMPTY_OR_INVALID: 'Empty or invalid CSV body',
  SLUG_GENERATION_FAILED: 'Failed to generate unique slug after multiple attempts',
  INVALID_LAYOUT_CONFIG: 'Invalid layout configuration data',
  INVALID_BATCH_JSON: 'JSON body must be an array of batch items',
  EMPTY_BATCH_PAYLOAD: 'No items found in the batch payload',
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  VERSIONS_NOT_FOUND: 'One or both versions not found.',
  UNAUTHORIZED_METRICS_ACCESS: 'Unauthorized access to metrics',
  UNSUPPORTED_CONTENT_TYPE: 'Unsupported Content-Type. Use application/json or text/csv',
  UNSUPPORTED_ACTION_TYPE: 'Unsupported action execution type',
  BATCH_VALIDATION_FAILED: 'Validation failed for batch items',
  VALIDATION_FAILED: 'Validation failed',
  VERSION_NOT_FOUND: 'Version not found',

  // --- Dynamic Errors ---
  ROLE_VERSION_ALREADY_EXISTS: (name: string) =>
    `A role version with name "${name}" already exists.`,
  ACCOUNT_LOCKED_TEMPORARY: (minutesLeft: number) =>
    `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
  BATCH_SIZE_EXCEEDED: (maxBatchSize: number) =>
    `Batch size exceeds maximum limit of ${maxBatchSize} items`,
  CATEGORY_DELETE_TENDERS_ASSOCIATED: (failedCodes: string) =>
    `Cannot delete categories because they are associated with active tenders: ${failedCodes}`,
  CSV_PARSE_FAILED: (err: { message: string }) => `Failed to parse CSV file: ${err.message}`,
  OAUTH_LOGIN_FAILED: (provider: string, message: string) =>
    `OAuth login failed with provider ${provider}: ${message}`,
  SLUG_CONFLICT_BATCH: (index: number, code: string, slug: string) =>
    `Slug conflict at item ${index + 1} (code ${code}): Slug '${slug}' is already taken`,
  MAX_CATEGORIES_EXCEEDED: (max: number) => `You can select at most ${max} categories`,
} as const;

/**
 * AppError — all expected, handled errors in the application.
 *
 * Usage:
 *   throw new AppError(
 *        AppErrorMessage.FORBIDDEN_INSUFFICIENT_PERMISSIONS,
 *        HttpStatusCode.FORBIDDEN,
 *        AppErrorCode.FORBIDDEN
 *   );
 *
 * The global errorHandler middleware catches these and returns a structured JSON response.
 * Unexpected errors (without isOperational=true) are treated as 500s.
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  /** Machine-readable error code for the frontend to act on */
  public readonly code: AppErrorCode;
  /** Always true for AppError — distinguishes from unexpected crashes */
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: HttpStatusCode, code: AppErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
