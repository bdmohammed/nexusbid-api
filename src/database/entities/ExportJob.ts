import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './User';

import { ExportFormat, ExportJobStatus, ExportJobType } from '@/types/enums';

@Entity('export_jobs')
@Check('"progress" BETWEEN 0 AND 100')
@Index('idx_export_jobs_status', ['status'])
@Index('idx_export_jobs_user_id', ['userId'])
@Index('idx_export_jobs_created_at', ['createdAt'])
@Index('idx_export_jobs_expires_at', ['expiresAt'])
@Index('idx_export_jobs_status_created', ['status', 'createdAt'])
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ExportJobStatus })
  status: ExportJobStatus;

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ name: 'export_type', type: 'enum', enum: ExportJobType })
  exportType: ExportJobType;

  @Column({ type: 'enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  filters: Record<string, unknown>;

  @Column({ name: 'storage_key', type: 'varchar', length: 255, nullable: true, default: null })
  storageKey: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true, default: null })
  expiredAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true, default: null })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true, default: null })
  finishedAt: Date | null;

  @Column({ name: 'download_count', type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ name: 'last_downloaded_at', type: 'timestamptz', nullable: true, default: null })
  lastDownloadedAt: Date | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true, default: null })
  fileName: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true, default: null })
  fileSizeBytes: number | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true, default: null })
  mimeType: string | null;

  @Column({ name: 'queue_name', type: 'varchar', length: 100, nullable: true, default: null })
  queueName: string | null;

  @Column({ name: 'job_id', type: 'varchar', length: 100, nullable: true, default: null })
  jobId: string | null;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true, default: null })
  errorMessage: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
