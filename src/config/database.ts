import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";

// ─── Entity Imports ───────────────────────────────────────────────────────────
import { AlertPreference } from "../database/entities/AlertPreference";
import { AuditLog } from "../database/entities/AuditLog";
import { Category } from "../database/entities/Category";
import { DownloadHistory } from "../database/entities/DownloadHistory";
import { EmailToken } from "../database/entities/EmailToken";
import { FeatureFlag } from "../database/entities/FeatureFlag";
import { Notification } from "../database/entities/Notification";
import { Plan } from "../database/entities/Plan";
import { PurchasedTender } from "../database/entities/PurchasedTender";
import { SavedTender } from "../database/entities/SavedTender";
import { State } from "../database/entities/State";
import { StaticPage } from "../database/entities/StaticPage";
import { Subscription } from "../database/entities/Subscription";
import { SupportTicket } from "../database/entities/SupportTicket";
import { Tender } from "../database/entities/Tender";
import { Transaction } from "../database/entities/Transaction";
import { User } from "../database/entities/User";
import { UserSession } from "../database/entities/UserSession";
import { WebhookEvent } from "../database/entities/WebhookEvent";
import { PermissionModule } from "../database/entities/PermissionModule";
import { Permission } from "../database/entities/Permission";
import { Role } from "../database/entities/Role";
import { UserRole } from "../database/entities/UserRole";
import { RoleVersion } from "../database/entities/RoleVersion";
import { RoleVersionPermission } from "../database/entities/RoleVersionPermission";
import { RoleReview } from "../database/entities/RoleReview";
import { RoleReviewAssignment } from "../database/entities/RoleReviewAssignment";
import { RoleReviewComment } from "../database/entities/RoleReviewComment";
import { PasswordHistory } from "../database/entities/PasswordHistory";
import { UserDevice } from "../database/entities/UserDevice";
import { SecurityLog } from "../database/entities/SecurityLog";
import { UserNote } from "../database/entities/UserNote";
import { TenderVersion } from "../database/entities/TenderVersion";
import { TenderDocument } from "../database/entities/TenderDocument";
import { TenderReview } from "../database/entities/TenderReview";
import { TenderReviewAssignment } from "../database/entities/TenderReviewAssignment";
import { TenderReviewComment } from "../database/entities/TenderReviewComment";
import { TenderCommittee } from "../database/entities/TenderCommittee";
import { TenderParticipant } from "../database/entities/TenderParticipant";
import { TenderEvaluation } from "../database/entities/TenderEvaluation";
import { TenderWatcher } from "../database/entities/TenderWatcher";
import { TenderInvitation } from "../database/entities/TenderInvitation";
import { TenderTemplate } from "../database/entities/TenderTemplate";
import { TenderQuestion } from "../database/entities/TenderQuestion";
import { TenderClarification } from "../database/entities/TenderClarification";
import { TenderAmendment } from "../database/entities/TenderAmendment";
import { EvaluationTemplate } from "../database/entities/EvaluationTemplate";
import { TenderSubmission } from "../database/entities/TenderSubmission";
import { PlanVersion } from "../database/entities/PlanVersion";
import { FeatureCatalog } from "../database/entities/FeatureCatalog";
import { PlanFeature } from "../database/entities/PlanFeature";
import { PlanCountryPricing } from "../database/entities/PlanCountryPricing";
import { PlanCategoryPricing } from "../database/entities/PlanCategoryPricing";
import { Coupon } from "../database/entities/Coupon";
import { PlanReview } from "../database/entities/PlanReview";
import { PlanReviewComment } from "../database/entities/PlanReviewComment";
import { SubscriptionMigration } from "../database/entities/SubscriptionMigration";
import { AnalyticsEvent } from "../database/entities/AnalyticsEvent";
import { AnalyticsMetric } from "../database/entities/AnalyticsMetric";
import { UserDashboardLayout } from "../database/entities/UserDashboardLayout";
import { ExportJob } from "../database/entities/ExportJob";
import { AnalyticsAlert } from "../database/entities/AnalyticsAlert";
import { ScheduledReport } from "../database/entities/ScheduledReport";
import { TenderDailyMetrics } from "../database/entities/TenderDailyMetrics";
import { UserDailyMetrics } from "../database/entities/UserDailyMetrics";
import { SubscriptionDailyMetrics } from "../database/entities/SubscriptionDailyMetrics";
import { TrafficDailyMetrics } from "../database/entities/TrafficDailyMetrics";
import { AuditRetentionPolicy } from "../database/entities/AuditRetentionPolicy";
import { SnakeNamingStrategy } from "./namingStrategy";
import { TypeOrmPinoLogger } from "./databaseLogger";
import { NotificationRecipient } from "../database/entities/NotificationRecipient";
import { NotificationAction } from "../database/entities/NotificationAction";
import { CategoryVersion } from "../database/entities/CategoryVersion";
import { CategoryReview } from "../database/entities/CategoryReview";
import { CategoryReviewAssignment } from "../database/entities/CategoryReviewAssignment";
import { CategoryReviewComment } from "../database/entities/CategoryReviewComment";
import { SeedHistory } from "../database/entities/seed-history.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
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

  logging: ["error", "warn", "migration"],
  logger: new TypeOrmPinoLogger(),
  maxQueryExecutionTime: env.DATABASE_SLOW_QUERY_THRESHOLD,

  entities: [
    AlertPreference,
    AuditLog,
    Category,
    CategoryVersion,
    CategoryReview,
    CategoryReviewAssignment,
    CategoryReviewComment,
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
    SeedHistory,
  ],

  migrations: [
    // Production: compiled JS files
    // Development (ts-node): TypeScript source files
    process.env["NODE_ENV"] === "prod"
      ? "dist/database/migrations/*.js"
      : "src/database/migrations/*.ts",
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

  ssl: env.NODE_ENV === "prod" ? { rejectUnauthorized: false } : false,
});
