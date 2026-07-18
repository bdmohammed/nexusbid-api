import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './User';

import { LogSource, SecurityEvent } from '@/types/enums';

export interface SecurityLogDetails {
  country?: string;
  region?: string;
  city?: string;
  [key: string]: unknown;
}

@Entity('security_logs')
@Index('idx_security_user_date', ['userId', 'createdAt'])
@Index('idx_security_email_date', ['email', 'createdAt'])
@Index('idx_security_correlation_id', ['correlationId'])
@Index('idx_security_request_id', ['requestId'])
export class SecurityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LogSource, default: LogSource.API })
  source: LogSource;

  @Column({ name: 'endpoint', type: 'varchar', nullable: true, default: null })
  endpoint: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, default: null })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  email: string | null;

  @Column({ type: 'enum', enum: SecurityEvent })
  event: SecurityEvent;

  @Column({ name: 'ip_address', type: 'inet', nullable: true, default: null })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true, default: null })
  userAgent: string | null;

  @Column({ name: 'session_id', type: 'varchar', nullable: true, default: null })
  sessionId: string | null;

  @Column({ name: 'request_id', type: 'varchar', nullable: true, default: null })
  requestId: string | null;

  @Column({ name: 'trace_id', type: 'varchar', nullable: true, default: null })
  traceId: string | null;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true, default: null })
  correlationId: string | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  details: SecurityLogDetails | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
