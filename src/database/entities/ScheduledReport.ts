import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ScheduledReportRecipient } from './ScheduledReportRecipient';
import { User } from './User';

import { ReportFormat, ReportFrequency, ReportType } from '@/types/enums';

export interface ScheduledReportFilters {
  categories?: string[] | undefined;
  states?: string[] | undefined;
  status?: string[] | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

@Entity('scheduled_reports')
@Index(['nextRunAt'])
@Index('idx_scheduled_reports_active_next_run', ['isActive', 'nextRunAt'])
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_name', type: 'varchar', length: 150 })
  reportName: string;

  @Column({ name: 'report_type', type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportFrequency })
  frequency: ReportFrequency;

  @Column({ name: 'cron_expression', type: 'varchar', length: 100, nullable: true, default: null })
  cronExpression: string | null;

  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  filters: ScheduledReportFilters;

  @Column({ type: 'enum', enum: ReportFormat })
  format: ReportFormat;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true, default: null })
  lastRunAt: Date | null;

  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true, default: null })
  lastSuccessAt: Date | null;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true, default: null })
  nextRunAt: Date | null;

  @Column({ name: 'failure_count', type: 'integer', default: 0 })
  failureCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true, default: null })
  lastError: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @Column({ name: 'locked_by', type: 'varchar', length: 100, nullable: true, default: null })
  lockedBy: string | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true, default: null })
  lockedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ScheduledReportRecipient, (recipient) => recipient.report, { cascade: true })
  recipients: ScheduledReportRecipient[];
}
