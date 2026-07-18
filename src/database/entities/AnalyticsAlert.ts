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

import { AlertSeverity, AlertSource, AlertTriggerCondition } from '@/types/enums';

@Entity('analytics_alerts')
@Index('idx_analytics_alerts_unresolved', ['resolved', 'severity', 'createdAt'])
@Index('idx_analytics_alerts_metric', ['metricKey'])
export class AnalyticsAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metric_key', type: 'varchar', length: 100 })
  metricKey: string;

  @Column({
    name: 'trigger_condition',
    type: 'enum',
    enum: AlertTriggerCondition,
  })
  triggerCondition: AlertTriggerCondition;

  @Column({ name: 'actual_value', type: 'double precision' })
  actualValue: number;

  @Column({ name: 'threshold_value', type: 'double precision' })
  thresholdValue: number;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.MEDIUM,
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertSource,
    default: AlertSource.SYSTEM,
  })
  source: AlertSource;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true, default: null })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true, default: null })
  resolvedBy: string | null;

  @ManyToOne(() => User, (user) => user.resolvedAlerts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'resolved_by' })
  resolvedByUser: User | null;

  @Column({ name: 'resolved_reason', type: 'text', nullable: true, default: null })
  resolvedReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
