import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ScheduledReport } from './ScheduledReport';

import { RecipientType } from '@/types/enums';

@Entity('scheduled_report_recipients')
@Index('idx_report_recipients_report_id', ['reportId'])
@Index('ux_report_recipients_user_role', ['reportId', 'recipientType', 'recipientId'], {
  unique: true,
  where: '"recipient_id" IS NOT NULL',
})
@Index('ux_report_recipients_email', ['reportId', 'recipientType', 'email'], {
  unique: true,
  where: '"email" IS NOT NULL',
})
@Index('ux_report_recipients_webhook', ['reportId', 'recipientType', 'webhook'], {
  unique: true,
  where: '"webhook" IS NOT NULL',
})
export class ScheduledReportRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @ManyToOne(() => ScheduledReport, (report) => report.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: ScheduledReport;

  @Column({ name: 'recipient_type', type: 'enum', enum: RecipientType })
  recipientType: RecipientType;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true, default: null })
  recipientId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  email: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  webhook: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
