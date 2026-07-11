import { DataSource } from 'typeorm';

// ─── Entity Imports ───────────────────────────────────────────────────────────
import { AlertPreference } from '../entities/AlertPreference';
import { AnalyticsAlert } from '../entities/AnalyticsAlert';
import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { AnalyticsMetric } from '../entities/AnalyticsMetric';
import { AuditLog } from '../entities/AuditLog';
import { AuditRetentionPolicy } from '../entities/AuditRetentionPolicy';
import { Category } from '../entities/Category';
import { Coupon } from '../entities/Coupon';
import { DownloadHistory } from '../entities/DownloadHistory';
import { EmailToken } from '../entities/EmailToken';
import { EvaluationTemplate } from '../entities/EvaluationTemplate';
import { ExportJob } from '../entities/ExportJob';
import { FeatureCatalog } from '../entities/FeatureCatalog';
import { FeatureFlag } from '../entities/FeatureFlag';
import { Notification } from '../entities/Notification';
import { NotificationAction } from '../entities/NotificationAction';
import { NotificationRecipient } from '../entities/NotificationRecipient';
import { PasswordHistory } from '../entities/PasswordHistory';
import { Permission } from '../entities/Permission';
import { PermissionModule } from '../entities/PermissionModule';
import { Plan } from '../entities/Plan';
import { PlanCategoryPricing } from '../entities/PlanCategoryPricing';
import { PlanCountryPricing } from '../entities/PlanCountryPricing';
import { PlanFeature } from '../entities/PlanFeature';
import { PlanReview } from '../entities/PlanReview';
import { PlanReviewComment } from '../entities/PlanReviewComment';
import { PlanVersion } from '../entities/PlanVersion';
import { PurchasedTender } from '../entities/PurchasedTender';
import { Role } from '../entities/Role';
import { RoleReview } from '../entities/RoleReview';
import { RoleReviewAssignment } from '../entities/RoleReviewAssignment';
import { RoleReviewComment } from '../entities/RoleReviewComment';
import { RoleVersion } from '../entities/RoleVersion';
import { RoleVersionPermission } from '../entities/RoleVersionPermission';
import { SavedTender } from '../entities/SavedTender';
import { ScheduledReport } from '../entities/ScheduledReport';
import { SecurityLog } from '../entities/SecurityLog';
import { State } from '../entities/State';
import { StaticPage } from '../entities/StaticPage';
import { Subscription } from '../entities/Subscription';
import { SubscriptionDailyMetrics } from '../entities/SubscriptionDailyMetrics';
import { SubscriptionMigration } from '../entities/SubscriptionMigration';
import { SupportTicket } from '../entities/SupportTicket';
import { Tender } from '../entities/Tender';
import { TenderAmendment } from '../entities/TenderAmendment';
import { TenderClarification } from '../entities/TenderClarification';
import { TenderCommittee } from '../entities/TenderCommittee';
import { TenderDailyMetrics } from '../entities/TenderDailyMetrics';
import { TenderDocument } from '../entities/TenderDocument';
import { TenderEvaluation } from '../entities/TenderEvaluation';
import { TenderInvitation } from '../entities/TenderInvitation';
import { TenderParticipant } from '../entities/TenderParticipant';
import { TenderQuestion } from '../entities/TenderQuestion';
import { TenderReview } from '../entities/TenderReview';
import { TenderReviewAssignment } from '../entities/TenderReviewAssignment';
import { TenderReviewComment } from '../entities/TenderReviewComment';
import { TenderSubmission } from '../entities/TenderSubmission';
import { TenderTemplate } from '../entities/TenderTemplate';
import { TenderVersion } from '../entities/TenderVersion';
import { TenderWatcher } from '../entities/TenderWatcher';
import { TrafficDailyMetrics } from '../entities/TrafficDailyMetrics';
import { Transaction } from '../entities/Transaction';
import { User } from '../entities/User';
import { UserDailyMetrics } from '../entities/UserDailyMetrics';
import { UserDashboardLayout } from '../entities/UserDashboardLayout';
import { UserDevice } from '../entities/UserDevice';
import { UserNote } from '../entities/UserNote';
import { UserRole } from '../entities/UserRole';
import { UserSession } from '../entities/UserSession';
import { WebhookEvent } from '../entities/WebhookEvent';

import { TypeOrmPinoLogger } from './databaseLogger';
import { env } from './env';
import { SnakeNamingStrategy } from './namingStrategy';

import 'reflect-metadata';

export const appDataSource = new DataSource({
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
    FeatureFlag,
    Notification,
    Plan,
    PurchasedTender,
    SavedTender,
    State,
    StaticPage,
    Subscription,
    SupportTicket,
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
    AnalyticsMetric,
    UserDashboardLayout,
    ExportJob,
    AnalyticsAlert,
    ScheduledReport,
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
    process.env['NODE_ENV'] === 'production' ? 'dist/migrations/*.js' : 'src/migrations/*.ts',
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
