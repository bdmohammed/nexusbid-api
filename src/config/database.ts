import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';

// ─── Entity Imports ───────────────────────────────────────────────────────────
import { AlertPreference } from '../entities/AlertPreference';
import { AuditLog } from '../entities/AuditLog';
import { Category } from '../entities/Category';
import { DownloadHistory } from '../entities/DownloadHistory';
import { EmailToken } from '../entities/EmailToken';
import { FeatureFlag } from '../entities/FeatureFlag';
import { Notification } from '../entities/Notification';
import { Plan } from '../entities/Plan';
import { PurchasedTender } from '../entities/PurchasedTender';
import { SavedTender } from '../entities/SavedTender';
import { State } from '../entities/State';
import { StaticPage } from '../entities/StaticPage';
import { Subscription } from '../entities/Subscription';
import { SupportTicket } from '../entities/SupportTicket';
import { Tender } from '../entities/Tender';
import { Transaction } from '../entities/Transaction';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { WebhookEvent } from '../entities/WebhookEvent';
import { PermissionModule } from '../entities/PermissionModule';
import { Permission } from '../entities/Permission';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';
import { RoleVersion } from '../entities/RoleVersion';
import { RoleVersionPermission } from '../entities/RoleVersionPermission';
import { RoleReview } from '../entities/RoleReview';
import { RoleReviewAssignment } from '../entities/RoleReviewAssignment';
import { RoleReviewComment } from '../entities/RoleReviewComment';
import { PasswordHistory } from '../entities/PasswordHistory';
import { UserDevice } from '../entities/UserDevice';
import { SecurityLog } from '../entities/SecurityLog';
import { UserNote } from '../entities/UserNote';
import { TenderVersion } from '../entities/TenderVersion';
import { TenderDocument } from '../entities/TenderDocument';
import { TenderReview } from '../entities/TenderReview';
import { TenderReviewAssignment } from '../entities/TenderReviewAssignment';
import { TenderReviewComment } from '../entities/TenderReviewComment';
import { TenderCommittee } from '../entities/TenderCommittee';
import { TenderParticipant } from '../entities/TenderParticipant';
import { TenderEvaluation } from '../entities/TenderEvaluation';
import { TenderWatcher } from '../entities/TenderWatcher';
import { TenderInvitation } from '../entities/TenderInvitation';
import { TenderTemplate } from '../entities/TenderTemplate';
import { TenderQuestion } from '../entities/TenderQuestion';
import { TenderClarification } from '../entities/TenderClarification';
import { TenderAmendment } from '../entities/TenderAmendment';
import { EvaluationTemplate } from '../entities/EvaluationTemplate';
import { TenderSubmission } from '../entities/TenderSubmission';
import { PlanVersion } from '../entities/PlanVersion';
import { FeatureCatalog } from '../entities/FeatureCatalog';
import { PlanFeature } from '../entities/PlanFeature';
import { PlanCountryPricing } from '../entities/PlanCountryPricing';
import { PlanCategoryPricing } from '../entities/PlanCategoryPricing';
import { Coupon } from '../entities/Coupon';
import { PlanReview } from '../entities/PlanReview';
import { PlanReviewComment } from '../entities/PlanReviewComment';
import { SubscriptionMigration } from '../entities/SubscriptionMigration';
import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { AnalyticsMetric } from '../entities/AnalyticsMetric';
import { UserDashboardLayout } from '../entities/UserDashboardLayout';
import { ExportJob } from '../entities/ExportJob';
import { AnalyticsAlert } from '../entities/AnalyticsAlert';
import { ScheduledReport } from '../entities/ScheduledReport';
import { TenderDailyMetrics } from '../entities/TenderDailyMetrics';
import { UserDailyMetrics } from '../entities/UserDailyMetrics';
import { SubscriptionDailyMetrics } from '../entities/SubscriptionDailyMetrics';
import { TrafficDailyMetrics } from '../entities/TrafficDailyMetrics';
import { AuditRetentionPolicy } from '../entities/AuditRetentionPolicy';
import { SnakeNamingStrategy } from './namingStrategy';
import { TypeOrmPinoLogger } from './databaseLogger';
import { NotificationRecipient } from '../entities/NotificationRecipient';
import { NotificationAction } from '../entities/NotificationAction';

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
    process.env['NODE_ENV'] === 'production'
      ? 'dist/migrations/*.js'
      : 'src/migrations/*.ts',
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

  ssl: env.NODE_ENV === 'prod'
    ? { rejectUnauthorized: false }
    : false,
});

/** @deprecated Use appDataSource instead to comply with internal naming standard */
export const AppDataSource = appDataSource;
