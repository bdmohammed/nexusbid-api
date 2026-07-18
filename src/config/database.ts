import { DataSource } from 'typeorm';

// ─── Entity Imports ───────────────────────────────────────────────────────────
import { AlertPreference } from '../database/entities/AlertPreference';
import { AnalyticsAlert } from '../database/entities/AnalyticsAlert';
import { AnalyticsEvent } from '../database/entities/AnalyticsEvent';
import { AuditLog } from '../database/entities/AuditLog';
import { AuditRetentionPolicy } from '../database/entities/AuditRetentionPolicy';
import { Category } from '../database/entities/Category';
import { Country } from '../database/entities/Country';
import { Coupon } from '../database/entities/Coupon';
import { DownloadHistory } from '../database/entities/DownloadHistory';
import { EmailToken } from '../database/entities/EmailToken';
import { EvaluationTemplate } from '../database/entities/EvaluationTemplate';
import { ExportJob } from '../database/entities/ExportJob';
import { FeatureCatalog } from '../database/entities/FeatureCatalog';
import { Notification } from '../database/entities/Notification';
import { NotificationAction } from '../database/entities/NotificationAction';
import { NotificationRecipient } from '../database/entities/NotificationRecipient';
import { PasswordHistory } from '../database/entities/PasswordHistory';
import { Permission } from '../database/entities/Permission';
import { PermissionModule } from '../database/entities/PermissionModule';
import { Plan } from '../database/entities/Plan';
import { PlanCategoryPricing } from '../database/entities/PlanCategoryPricing';
import { PlanCountryPricing } from '../database/entities/PlanCountryPricing';
import { PlanFeature } from '../database/entities/PlanFeature';
import { PlanReview } from '../database/entities/PlanReview';
import { PlanReviewAssignment } from '../database/entities/PlanReviewAssignment';
import { PlanReviewComment } from '../database/entities/PlanReviewComment';
import { PlanVersion } from '../database/entities/PlanVersion';
import { PurchasedTender } from '../database/entities/PurchasedTender';
import { Role } from '../database/entities/Role';
import { RoleReview } from '../database/entities/RoleReview';
import { RoleReviewAssignment } from '../database/entities/RoleReviewAssignment';
import { RoleReviewComment } from '../database/entities/RoleReviewComment';
import { RoleVersion } from '../database/entities/RoleVersion';
import { RoleVersionPermission } from '../database/entities/RoleVersionPermission';
import { ScheduledReport } from '../database/entities/ScheduledReport';
import { ScheduledReportRecipient } from '../database/entities/ScheduledReportRecipient';
import { SecurityLog } from '../database/entities/SecurityLog';
import { State } from '../database/entities/State';
import { Subscription } from '../database/entities/Subscription';
import { SubscriptionDailyMetrics } from '../database/entities/SubscriptionDailyMetrics';
import { SubscriptionMigration } from '../database/entities/SubscriptionMigration';
import { SupportTicket } from '../database/entities/SupportTicket';
import { SupportTicketAttachment } from '../database/entities/SupportTicketAttachment';
import { SupportTicketMessage } from '../database/entities/SupportTicketMessage';
import { Tender } from '../database/entities/Tender';
import { TenderAmendment } from '../database/entities/TenderAmendment';
import { TenderClarification } from '../database/entities/TenderClarification';
import { TenderCommittee } from '../database/entities/TenderCommittee';
import { TenderDailyMetrics } from '../database/entities/TenderDailyMetrics';
import { TenderDocument } from '../database/entities/TenderDocument';
import { TenderEvaluation } from '../database/entities/TenderEvaluation';
import { TenderInvitation } from '../database/entities/TenderInvitation';
import { TenderParticipant } from '../database/entities/TenderParticipant';
import { TenderQuestion } from '../database/entities/TenderQuestion';
import { TenderReview } from '../database/entities/TenderReview';
import { TenderReviewAssignment } from '../database/entities/TenderReviewAssignment';
import { TenderReviewComment } from '../database/entities/TenderReviewComment';
import { TenderSubmission } from '../database/entities/TenderSubmission';
import { TenderTemplate } from '../database/entities/TenderTemplate';
import { TenderVersion } from '../database/entities/TenderVersion';
import { TenderWatcher } from '../database/entities/TenderWatcher';
import { TrafficDailyMetrics } from '../database/entities/TrafficDailyMetrics';
import { Transaction } from '../database/entities/Transaction';
import { User } from '../database/entities/User';
import { UserDailyMetrics } from '../database/entities/UserDailyMetrics';
import { UserDashboardLayout } from '../database/entities/UserDashboardLayout';
import { UserDevice } from '../database/entities/UserDevice';
import { UserNote } from '../database/entities/UserNote';
import { UserRole } from '../database/entities/UserRole';
import { UserSession } from '../database/entities/UserSession';
import { WebhookEvent } from '../database/entities/WebhookEvent';

import { TypeOrmPinoLogger } from './databaseLogger';
import { env } from './env';
import { SnakeNamingStrategy } from './namingStrategy';

import 'reflect-metadata';

export const AppDataSource = new DataSource({
  type: 'postgres',
  namingStrategy: new SnakeNamingStrategy(),
  url: env.DATABASE_URL,

  /**
   * NEVER set synchronize: true in any environment.
   * Schema changes are managed exclusively through migrations.
   */
  synchronize: false,

  /**
   * Run migrations automatically on startup.
   * Safe because migrations are idempotent (TypeORM tracks executed migrations).
   */
  migrationsRun: true,

  logging: ['error', 'warn', 'migration'],
  logger: new TypeOrmPinoLogger(),
  maxQueryExecutionTime: env.DATABASE_SLOW_QUERY_THRESHOLD,

  entities: [
    AlertPreference,
    AuditLog,
    Category,
    DownloadHistory,
    EmailToken,
    Notification,
    Plan,
    PurchasedTender,
    State,
    Country,
    Subscription,
    SupportTicket,
    SupportTicketMessage,
    SupportTicketAttachment,
    Tender,
    TenderVersion,
    TenderDocument,
    TenderReview,
    TenderReviewAssignment,
    TenderReviewComment,
    TenderCommittee,
    TenderParticipant,
    TenderEvaluation,
    TenderWatcher,
    TenderInvitation,
    TenderTemplate,
    TenderQuestion,
    TenderClarification,
    TenderAmendment,
    EvaluationTemplate,
    TenderSubmission,
    PlanVersion,
    FeatureCatalog,
    PlanFeature,
    PlanCountryPricing,
    PlanCategoryPricing,
    Coupon,
    PlanReview,
    PlanReviewAssignment,
    PlanReviewComment,
    SubscriptionMigration,
    Transaction,
    User,
    UserSession,
    WebhookEvent,
    AuditRetentionPolicy,
    PermissionModule,
    Permission,
    Role,
    UserRole,
    RoleVersion,
    RoleVersionPermission,
    RoleReview,
    RoleReviewAssignment,
    RoleReviewComment,
    PasswordHistory,
    UserDevice,
    SecurityLog,
    UserNote,
    AnalyticsEvent,
    UserDashboardLayout,
    ExportJob,
    AnalyticsAlert,
    ScheduledReport,
    ScheduledReportRecipient,
    TenderDailyMetrics,
    UserDailyMetrics,
    SubscriptionDailyMetrics,
    TrafficDailyMetrics,
    NotificationRecipient,
    NotificationAction,
  ],

  migrations: [
    // Production: compiled JS files
    // Development (ts-node): TypeScript source files
    ['prod', 'uat'].includes(env.NODE_ENV)
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts',
  ],

  /**
   * Connection pool limits per PM2 worker.
   * With 4 workers and max=10, total DB connections = 40.
   * Adjust max if using Neon/Supabase connection pooler (pgBouncer).
   */
  extra: {
    max: 10,
    connectionTimeoutMillis: 3000,
    query_timeout: 5000,
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 10000,
  },

  ssl: env.NODE_ENV === 'prod' ? { rejectUnauthorized: false } : false,
});
