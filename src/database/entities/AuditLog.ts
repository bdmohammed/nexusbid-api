import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum AuditModule {
  AUTH = 'AUTH',
  USER = 'USER',
  RBAC = 'RBAC',
  TENDER = 'TENDER',
  CATEGORY = 'CATEGORY',
  PAYMENT = 'PAYMENT',
  SYSTEM = 'SYSTEM',
  NOTIFICATION = 'NOTIFICATION',
  CMS = 'CMS',
  SUBSCRIPTION = 'SUBSCRIPTION',
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

/**
 * Immutable admin action audit log.
 * NEVER update or delete rows. Append-only.
 * actorEmail is denormalized to preserve the record if the admin is later deleted.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_created_at', ['createdAt'])
@Index('idx_audit_logs_actor_user_id', ['actorUserId'])
@Index('idx_audit_logs_target_user_id', ['targetUserId'])
@Index('idx_audit_logs_module', ['module'])
@Index('idx_audit_logs_severity', ['severity'])
@Index('idx_audit_logs_correlation_id', ['correlationId'])
@Index('idx_audit_logs_request_id', ['requestId'])
@Index('idx_audit_logs_entity_id', ['entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'event_id', default: () => 'gen_random_uuid()' })
  eventId: string;

  @Column({ type: 'uuid', name: 'correlation_id', nullable: true, default: null })
  correlationId: string | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  actorId: string | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true, default: null })
  actorUserId: string | null;

  @Column({ type: 'uuid', name: 'target_user_id', nullable: true, default: null })
  targetUserId: string | null;

  /** Denormalized — preserved even if user is deleted */
  @Column()
  actorEmail: string;

  @Column({ type: 'varchar', nullable: true })
  module: AuditModule | string | null;

  @Column({ type: 'varchar' })
  action: AuditAction | string;

  /** e.g. 'tender', 'user', 'subscription' */
  @Column()
  entityType: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  entityId: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  severity: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  status: string | null;

  /** State before the action (alias/source of oldValues) */
  @Column({ type: 'jsonb', nullable: true, default: null })
  before: Record<string, unknown> | null;

  /** State after the action (alias/source of newValues) */
  @Column({ type: 'jsonb', nullable: true, default: null })
  after: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  requestId: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  ipAddress: string | null;

  @Column({ type: 'varchar', name: 'session_id', nullable: true, default: null })
  sessionId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
