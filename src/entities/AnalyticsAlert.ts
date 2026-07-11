import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('analytics_alerts')
export class AnalyticsAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metric_key', type: 'varchar', length: 100 })
  metricKey: string;

  @Column({ name: 'trigger_condition', type: 'varchar', length: 150 })
  triggerCondition: string;

  @Column({ name: 'actual_value', type: 'varchar', length: 100 })
  actualValue: string;

  @Column({ name: 'threshold_value', type: 'varchar', length: 100 })
  thresholdValue: string;

  @Column({ type: 'varchar', length: 50, default: 'MEDIUM' })
  severity: string;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
