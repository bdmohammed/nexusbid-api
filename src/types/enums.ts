// ─── Account Types ───────────────────────────────────────────────────────────

export enum AccountType {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

// ─── Tender ───────────────────────────────────────────────────────────────────

export enum TenderLifecycleStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}

export enum TenderVersionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEW_ASSIGNED = 'REVIEW_ASSIGNED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export enum TenderPublicationStatus {
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  AWARDED = 'AWARDED',
  COMPLETED = 'COMPLETED',
}

/**
 * Visibility matrix:
 *   ACTIVE          → visible to all (visitors: preview; subscribers: full)
 *   All others      → admin-only (never shown to customers)
 */

export enum SubmissionType {
  DIGITAL = 'digital',
  PHYSICAL = 'physical',
  BOTH = 'both',
}

// ─── Subscription & Billing ───────────────────────────────────────────────────

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  SUBSCRIPTION = 'subscription',
  PER_TENDER = 'per_tender',
}

export enum TransactionStatus {
  CREATED = 'created',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ─── Alerts & Notifications ───────────────────────────────────────────────────

export enum AlertFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum NotificationType {
  NEW_TENDER = 'new_tender',
  TENDER_UPDATED = 'tender_updated',
  DEADLINE_REMINDER = 'deadline_reminder',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  ROLE_WORKFLOW = 'role_workflow',
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export enum WebhookEventStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

// ─── Email Tokens ─────────────────────────────────────────────────────────────

export enum EmailTokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  EMAIL_CHANGE = 'email_change',
  SYSTEM_OWNER_APPROVAL = 'system_owner_approval',
}

// ─── Support ─────────────────────────────────────────────────────────────────

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

// ─── Permission Keys ─────────────────────────────────────────────────────────

export enum PermissionKey {
  MANAGE_CATEGORIES = 'category.manage',
  MANAGE_STATES = 'state.manage',
  UPLOAD_PDF = 'tender.upload_pdf',
  CREATE_TENDER = 'tender.create',
  EDIT_TENDER = 'tender.edit',
  APPROVE_TENDER = 'tender.approve',
  DELETE_TENDER = 'tender.delete',
  VIEW_USERS = 'user.view',
  VIEW_ANALYTICS = 'analytics.view',
  EXPORT_ANALYTICS = 'analytics.export',
  VIEW_SUBSCRIPTIONS = 'subscription.view',
  PROCESS_REFUNDS = 'subscription.refund',
  MANAGE_PLANS = 'plan.manage',
  VIEW_TICKETS = 'ticket.view',
  REPLY_TICKETS = 'ticket.reply',
  EDIT_CMS = 'cms.edit',
}

// ─── User Status ─────────────────────────────────────────────────────────────

export enum UserStatus {
  PENDING_EMAIL_VERIFICATION = 'pending_email_verification',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  ARCHIVED = 'archived',
  BLOCKED = 'BLOCKED',
  REJECTED_BY_ADMIN = 'rejected_by_admin',
  APPROVED = 'APPROVED',
}

// ─── Geography ───────────────────────────────────────────────────────────────

export enum StateType {
  STATE = 'state',
  TERRITORY = 'territory',
  FEDERAL = 'federal',
}

// ─── Support Details ─────────────────────────────────────────────────────────

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  BILLING = 'billing',
  TECHNICAL = 'technical',
  TENDER = 'tender',
  ACCOUNT = 'account',
  SUBSCRIPTION = 'subscription',
}

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum RoleVersionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REOPENED = 'REOPENED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export enum ReviewAssignmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export enum ReviewAction {
  SUBMIT = 'SUBMIT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  AUTO_EXPIRE = 'AUTO_EXPIRE',
}

export enum DashboardTheme {
  DEFAULT = 'default',
  LIGHT = 'light',
  DARK = 'dark',
}

export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CRON = 'cron',
}

export enum ReportType {
  TENDER = 'tender',
  USERS = 'users',
  SUBSCRIPTIONS = 'subscriptions',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
}

export enum RecipientType {
  USER = 'user',
  ROLE = 'role',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
}

export enum LogSource {
  API = 'API',
  QUEUE = 'QUEUE',
  CRON = 'CRON',
  WEBHOOK = 'WEBHOOK',
  ADMIN_PANEL = 'ADMIN_PANEL',
  SYSTEM = 'SYSTEM',
}

export enum SecurityEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  USER_LOGIN = 'user_login',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_FAILED = 'MFA_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED',
  ACCOUNT_DELETE_REQUESTED = 'ACCOUNT_DELETE_REQUESTED',
  RESEND_VERIFICATION_SUCCESS = 'RESEND_VERIFICATION_SUCCESS',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  CAPTCHA_FAILED = 'CAPTCHA_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  EMAIL_CHANGE_REQUEST = 'EMAIL_CHANGE_REQUEST',
  EMAIL_CHANGE_SUCCESS = 'EMAIL_CHANGE_SUCCESS',
  EMAIL_CHANGE_VERIFY = 'EMAIL_CHANGE_VERIFY',
  ADMIN_REGISTER_SUCCESS = 'ADMIN_REGISTER_SUCCESS',
}

export enum ExportJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ExportJobType {
  TENDER = 'tender',
  USERS = 'users',
  SUBSCRIPTIONS = 'subscriptions',
  FINANCIAL = 'financial',
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
  JSON = 'json',
}

export enum RetentionCategory {
  AUDIT_LOG = 'AUDIT_LOG',
  SECURITY_LOG = 'SECURITY_LOG',
  EXPORT_JOB = 'EXPORT_JOB',
  EMAIL_TOKEN = 'EMAIL_TOKEN',
  PASSWORD_HISTORY = 'PASSWORD_HISTORY',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
}

export enum DownloadSource {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  WEB = 'WEB',
  API = 'API',
  EXPORT = 'EXPORT',
  EMAIL_LINK = 'EMAIL_LINK',
  SCHEDULED_REPORT = 'SCHEDULED_REPORT',
}

export enum NotificationCategory {
  SYSTEM = 'SYSTEM',
  TENDER = 'TENDER',
  BILLING = 'BILLING',
  SECURITY = 'SECURITY',
  WORKSPACE = 'WORKSPACE',
  REVIEW = 'REVIEW',
  ROLE = 'ROLE',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
}

export enum NotificationRecipientStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DISMISSED = 'DISMISSED',
}

export enum NotificationActionType {
  REDIRECT = 'REDIRECT',
  API_POST = 'API_POST',
  MODAL = 'MODAL',
  DOWNLOAD = 'DOWNLOAD',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  TENDER_APPROVE = 'TENDER_APPROVE',
  TENDER_REJECT = 'TENDER_REJECT',
  TENDER_PUBLISH = 'TENDER_PUBLISH',
  TENDER_ARCHIVE = 'TENDER_ARCHIVE',
  ROLE_APPROVE = 'ROLE_APPROVE',
  ROLE_REJECT = 'ROLE_REJECT',
  ROLE_PUBLISH = 'ROLE_PUBLISH',
  ROLE_ARCHIVE = 'ROLE_ARCHIVE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum PlanVersionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export enum FeatureValueType {
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
}

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_MONTH = 'FREE_MONTH',
  TRIAL_EXTENSION = 'TRIAL_EXTENSION',
}

export enum AnalyticsEventType {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_VERIFIED = 'USER_VERIFIED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  TENDER_CREATED = 'TENDER_CREATED',
  TENDER_PUBLISHED = 'TENDER_PUBLISHED',
  TENDER_AWARDED = 'TENDER_AWARDED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  TENDER_DOWNLOADED = 'TENDER_DOWNLOADED',
  TENDER_VIEWED = 'TENDER_VIEWED',
  PAGE_VIEW = 'PAGE_VIEW',
  SEARCH = 'SEARCH',
  EXPORT_STARTED = 'EXPORT_STARTED',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertTriggerCondition {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUAL_TO = 'EQUAL_TO',
  NOT_EQUAL_TO = 'NOT_EQUAL_TO',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
}

export enum AlertSource {
  SYSTEM = 'SYSTEM',
  DATABASE = 'DATABASE',
  APPLICATION = 'APPLICATION',
  SECURITY = 'SECURITY',
  INTEGRATION = 'INTEGRATION',
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  BOT = 'BOT',
}

export enum BrowserType {
  CHROME = 'CHROME',
  FIREFOX = 'FIREFOX',
  EDGE = 'EDGE',
  SAFARI = 'SAFARI',
  OTHER = 'OTHER',
}

export enum WebhookProvider {
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export enum WebhookEventType {
  BILLING_SUBSCRIPTION_ACTIVATED = 'BILLING.SUBSCRIPTION.ACTIVATED',
  BILLING_SUBSCRIPTION_CANCELLED = 'BILLING.SUBSCRIPTION.CANCELLED',
  BILLING_SUBSCRIPTION_EXPIRED = 'BILLING.SUBSCRIPTION.EXPIRED',
  PAYMENT_SALE_COMPLETED = 'PAYMENT.SALE.COMPLETED',
  PAYMENT_SALE_DENIED = 'PAYMENT.SALE.DENIED',
  PAYMENT_CAPTURE_COMPLETED = 'PAYMENT.CAPTURE.COMPLETED',
  UNKNOWN = 'UNKNOWN',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  EXPORT = 'EXPORT',
  DOWNLOAD = 'DOWNLOAD',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  SKIPPED = 'SKIPPED',
}

export enum SeedStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  APPLIED = 'APPLIED',
  SKIPPED = 'SKIPPED',
  INVALID = 'INVALID',
}

export enum SubscriptionMigrationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PlanType {
  ALL_ACCESS = 'all-access',
  STATE = 'state',
  COUNTRY = 'country',
  CATEGORY = 'category',
  BUNDLE = 'bundle',
}
