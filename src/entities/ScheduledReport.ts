import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_name', type: 'varchar', length: 150 })
  reportName: string;

  @Column({ type: 'varchar', length: 50 })
  frequency: string;

  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', default: '{}' })
  filters: Record<string, any>;

  @Column({ type: 'jsonb', default: '{}' })
  recipients: {
    users?: string[];
    roles?: string[];
    emails?: string[];
    webhooks?: string[];
  };

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
