import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

import { AccountType, UserStatus } from '../../types/enums';

import { AlertPreference } from './AlertPreference';
import { AnalyticsAlert } from './AnalyticsAlert';
import { AnalyticsEvent } from './AnalyticsEvent';
import { AuditLog } from './AuditLog';
import { AuditRetentionPolicy } from './AuditRetentionPolicy';
import { Category } from './Category';
import { Country } from './Country';
import { Coupon } from './Coupon';
import { DownloadHistory } from './DownloadHistory';
import { EmailToken } from './EmailToken';
import { EvaluationTemplate } from './EvaluationTemplate';
import { ExportJob } from './ExportJob';
import { FeatureCatalog } from './FeatureCatalog';
import { Notification } from './Notification';
import { NotificationRecipient } from './NotificationRecipient';
import { PasswordHistory } from './PasswordHistory';
import { Permission } from './Permission';
import { PermissionModule } from './PermissionModule';
import { PlanReviewAssignment } from './PlanReviewAssignment';
import { PlanVersion } from './PlanVersion';
import { Role } from './Role';
import { ScheduledReport } from './ScheduledReport';
import { State } from './State';
import { Subscription } from './Subscription';
import { SubscriptionDailyMetrics } from './SubscriptionDailyMetrics';
import { SupportTicket } from './SupportTicket';
import { SupportTicketMessage } from './SupportTicketMessage';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { Transaction } from './Transaction';
import { UserDailyMetrics } from './UserDailyMetrics';
import { UserDashboardLayout } from './UserDashboardLayout';
import { UserRole } from './UserRole';

@Entity('users')
@Index(['email'])
@Index(['accountType'])
@Index(['accountType', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({
    name: 'country_id',
    type: 'smallint',
  })
  countryId: number;

  @ManyToOne(() => Country, (country) => country.users, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'account_type', type: 'enum', enum: AccountType, default: AccountType.USER })
  accountType: AccountType;

  @Column({ name: 'company_name', type: 'varchar', length: 160 })
  companyName: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked: boolean;

  @Index()
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING_EMAIL_VERIFICATION })
  status: UserStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @RelationId((user: User) => user.approvedBy)
  approvedById: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true, default: null })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true, default: null })
  rejectionReason: string | null;

  /**
   * Incremented on password change, email change, or account block.
   * JWT payload carries tokenVersion — mismatch = revoked session.
   */
  @Column({ name: 'token_version', type: 'int', default: 1 })
  tokenVersion: number;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'lockout_until', type: 'timestamptz', nullable: true, default: null })
  lockoutUntil: Date | null;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true, default: null })
  passwordChangedAt: Date | null;

  @Column({ name: 'must_reset_password', type: 'boolean', default: false })
  mustResetPassword: boolean;

  @Column({
    name: 'pending_email',
    type: 'varchar',
    unique: true,
    nullable: true,
    length: 255,
    default: null,
  })
  pendingEmail: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true, length: 255, default: null })
  avatarUrl: string | null;

  @Column({
    name: 'notification_preferences',
    type: 'jsonb',
    default: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      security: true,
      tender: true,
      newsletter: false,
    },
  })
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    security: boolean;
    tender: boolean;
    newsletter: boolean;
  };

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true, default: null })
  lastLoginAt: Date | null;

  @Column({ name: 'email_changed_at', type: 'timestamptz', nullable: true, default: null })
  emailChangedAt: Date | null;

  @Index()
  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true, default: null })
  googleId: string | null;

  @Index()
  @Column({ name: 'github_id', type: 'varchar', length: 255, nullable: true, default: null })
  githubId: string | null;

  @Index()
  @Column({ name: 'microsoft_id', type: 'varchar', length: 255, nullable: true, default: null })
  microsoftId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt: Date | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => Subscription, (subscriptions) => subscriptions.user)
  subscriptions: Subscription[];

  @OneToMany(() => Transaction, (transactions) => transactions.user)
  transactions: Transaction[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => Role, (role) => role.createdBy)
  rolesCreated: Role[];

  @OneToMany(() => Role, (role) => role.updatedBy)
  rolesUpdated: Role[];

  @OneToMany(() => UserRole, (assignedRoles) => assignedRoles.assignedBy)
  assignedRoles: UserRole[];

  @OneToMany(() => Country, (country) => country.createdBy)
  CountriesCreated: Country[];

  @OneToMany(() => Country, (country) => country.updatedBy)
  CountriesUpdated: Country[];

  @OneToMany(() => State, (state) => state.createdBy)
  StatesCreated: State[];

  @OneToMany(() => State, (state) => state.updatedBy)
  StatesUpdated: State[];

  @OneToMany(() => PermissionModule, (permissionModule) => permissionModule.createdBy)
  PermissionModulesCreated: PermissionModule[];

  @OneToMany(() => PermissionModule, (permissionModule) => permissionModule.updatedBy)
  PermissionModulesUpdated: PermissionModule[];

  @OneToMany(() => Permission, (permission) => permission.createdBy)
  PermissionsCreated: Permission[];

  @OneToMany(() => Permission, (permission) => permission.updatedBy)
  PermissionsUpdated: Permission[];

  @OneToMany(() => EmailToken, (emailToken) => emailToken.user)
  EmailTokensCreated: EmailToken[];

  @OneToMany(() => PasswordHistory, (passwordHistory) => passwordHistory.user)
  PasswordHistoryCreated: PasswordHistory[];

  @OneToMany(() => SupportTicket, (t) => t.user)
  supportTickets: SupportTicket[];

  @OneToMany(() => SupportTicket, (t) => t.assignedTo)
  assignedTickets: SupportTicket[];

  @OneToMany(() => SupportTicketMessage, (m) => m.sender)
  supportTicketMessages: SupportTicketMessage[];

  @OneToOne(() => UserDashboardLayout, (userDashboardLayout) => userDashboardLayout.user)
  userDashboardLayout: UserDashboardLayout | null;

  @OneToMany(() => ScheduledReport, (report) => report.createdByUser)
  scheduledReports: ScheduledReport[];

  @OneToMany(() => ExportJob, (job) => job.userId)
  exportJobs: ExportJob[];

  @OneToMany(() => AuditRetentionPolicy, (policy) => policy.updatedBy)
  retentionPoliciesUpdated: AuditRetentionPolicy[];

  @OneToMany(() => AuditRetentionPolicy, (policy) => policy.createdBy)
  retentionPoliciesCreated: AuditRetentionPolicy[];

  @OneToMany(() => DownloadHistory, (downloadHistory) => downloadHistory.user)
  downloadHistory: DownloadHistory[];

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.user)
  receivedNotifications: NotificationRecipient[];

  @OneToMany(() => Notification, (notification) => notification.senderUser)
  sentNotifications: Notification[];

  @OneToMany(() => PlanVersion, (version) => version.lockedByUser)
  lockedPlanVersions: PlanVersion[];

  @OneToMany(() => PlanVersion, (version) => version.createdByUser)
  createdPlanVersions: PlanVersion[];

  @OneToMany(() => PlanVersion, (version) => version.updatedByUser)
  updatedPlanVersions: PlanVersion[];

  @OneToMany(() => PlanVersion, (version) => version.approvedByUser)
  approvedPlanVersions: PlanVersion[];

  @OneToMany(() => PlanReviewAssignment, (assignment) => assignment.reviewer)
  planReviewAssignments: PlanReviewAssignment[];

  @OneToMany(() => Coupon, (coupon) => coupon.createdByUser)
  createdCoupons: Coupon[];

  @OneToMany(() => Coupon, (coupon) => coupon.updatedByUser)
  updatedCoupons: Coupon[];

  @OneToMany(() => AnalyticsEvent, (event) => event.actor)
  analyticsEvents: AnalyticsEvent[];

  @OneToMany(() => AnalyticsAlert, (alert) => alert.resolvedByUser)
  resolvedAlerts: AnalyticsAlert[];

  @OneToMany(() => AlertPreference, (alertPreference) => alertPreference.user)
  alertPreferences: AlertPreference[];

  @OneToMany(() => EvaluationTemplate, (template) => template.createdByUser)
  createdEvaluationTemplates: EvaluationTemplate[];

  @OneToMany(() => EvaluationTemplate, (template) => template.updatedByUser)
  updatedEvaluationTemplates: EvaluationTemplate[];

  @OneToMany(() => FeatureCatalog, (fc) => fc.createdByUser)
  createdFeatureCatalogs: FeatureCatalog[];

  @OneToMany(() => FeatureCatalog, (fc) => fc.updatedByUser)
  updatedFeatureCatalogs: FeatureCatalog[];

  @OneToMany(() => AuditLog, (log) => log.actorUser)
  actorAuditLogs: AuditLog[];

  @OneToMany(() => AuditLog, (log) => log.targetUser)
  targetAuditLogs: AuditLog[];

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.createdBy)
  createdTenderMetrics: TenderDailyMetrics[];

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.updatedBy)
  updatedTenderMetrics: TenderDailyMetrics[];

  @OneToMany(() => UserDailyMetrics, (metrics) => metrics.createdBy)
  createdUserMetrics: UserDailyMetrics[];

  @OneToMany(() => UserDailyMetrics, (metrics) => metrics.updatedBy)
  updatedUserMetrics: UserDailyMetrics[];

  @OneToMany(() => SubscriptionDailyMetrics, (metrics) => metrics.createdBy)
  createdSubscriptionMetrics: SubscriptionDailyMetrics[];

  @OneToMany(() => SubscriptionDailyMetrics, (metrics) => metrics.updatedBy)
  updatedSubscriptionMetrics: SubscriptionDailyMetrics[];

  @OneToMany(() => Category, (category) => category.createdByUser)
  createdCategories: Category[];

  @OneToMany(() => Category, (category) => category.updatedByUser)
  updatedCategories: Category[];
}
