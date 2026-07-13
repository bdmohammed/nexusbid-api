// ─── Account Types ───────────────────────────────────────────────────────────

export enum AccountType {
  USER = "user",
  ADMIN = "admin",
  SYSTEM = "system",
}

// ─── Tender ───────────────────────────────────────────────────────────────────

export enum TenderLifecycleStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  CANCELLED = "CANCELLED",
}

export enum TenderVersionStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  REVIEW_ASSIGNED = "REVIEW_ASSIGNED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
}

export enum TenderPublicationStatus {
  SCHEDULED = "SCHEDULED",
  PUBLISHED = "PUBLISHED",
  OPEN = "OPEN",
  CLOSING = "CLOSING",
  CLOSED = "CLOSED",
  AWARDED = "AWARDED",
  COMPLETED = "COMPLETED",
}

/**
 * Visibility matrix:
 *   ACTIVE          → visible to all (visitors: preview; subscribers: full)
 *   All others      → admin-only (never shown to customers)
 */

export enum SubmissionType {
  DIGITAL = "digital",
  PHYSICAL = "physical",
  BOTH = "both",
}

// ─── Subscription & Billing ───────────────────────────────────────────────────

export enum SubscriptionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum TransactionType {
  SUBSCRIPTION = "subscription",
  PER_TENDER = "per_tender",
}

export enum TransactionStatus {
  CREATED = "created",
  SUCCESS = "success",
  FAILED = "failed",
  REFUNDED = "refunded",
}

// ─── Alerts & Notifications ───────────────────────────────────────────────────

export enum AlertFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
}

export enum NotificationType {
  NEW_TENDER = "new_tender",
  TENDER_UPDATED = "tender_updated",
  DEADLINE_REMINDER = "deadline_reminder",
  SUBSCRIPTION_EXPIRING = "subscription_expiring",
  PAYMENT_SUCCESS = "payment_success",
  PAYMENT_FAILED = "payment_failed",
  ROLE_WORKFLOW = "role_workflow",
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export enum WebhookEventStatus {
  RECEIVED = "received",
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
  IGNORED = "ignored",
}

// ─── Email Tokens ─────────────────────────────────────────────────────────────

export enum EmailTokenType {
  EMAIL_VERIFICATION = "email_verification",
  PASSWORD_RESET = "password_reset",
  EMAIL_CHANGE = "email_change",
  SYSTEM_OWNER_APPROVAL = "system_owner_approval",
}

// ─── Support ─────────────────────────────────────────────────────────────────

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

// ─── Permission Keys ─────────────────────────────────────────────────────────

export enum PermissionKey {
  MANAGE_CATEGORIES = "category.manage",
  MANAGE_STATES = "state.manage",
  UPLOAD_PDF = "tender.upload_pdf",
  CREATE_TENDER = "tender.create",
  EDIT_TENDER = "tender.edit",
  APPROVE_TENDER = "tender.approve",
  DELETE_TENDER = "tender.delete",
  VIEW_USERS = "user.view",
  VIEW_ANALYTICS = "analytics.view",
  EXPORT_ANALYTICS = "analytics.export",
  VIEW_SUBSCRIPTIONS = "subscription.view",
  PROCESS_REFUNDS = "subscription.refund",
  MANAGE_PLANS = "plan.manage",
  VIEW_TICKETS = "ticket.view",
  REPLY_TICKETS = "ticket.reply",
  EDIT_CMS = "cms.edit",
  CATEGORY_VIEW = "category.view",
  CATEGORY_CREATE = "category.create",
  CATEGORY_UPDATE = "category.update",
  CATEGORY_REVIEW = "category.review",
  CATEGORY_APPROVE = "category.approve",
  CATEGORY_REJECT = "category.reject",
  CATEGORY_MOVE = "category.move",
  CATEGORY_MERGE = "category.merge",
  CATEGORY_IMPORT = "category.import",
  CATEGORY_EXPORT = "category.export",
  CATEGORY_ARCHIVE = "category.archive",
}

// ─── User Status ─────────────────────────────────────────────────────────────

export enum UserStatus {
  PENDING_EMAIL_VERIFICATION = "pending_email_verification",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
  ARCHIVED = "archived",
}

// ─── Category Workflow & Review ──────────────────────────────────────────────

export enum CategoryStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum CategoryWorkflowStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum CategoryReviewStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
}

export enum CategoryReviewAssignmentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
}

export enum ReviewPolicy {
  SINGLE_APPROVER = "SINGLE_APPROVER",
  MAJORITY = "MAJORITY",
  UNANIMOUS = "UNANIMOUS",
}
