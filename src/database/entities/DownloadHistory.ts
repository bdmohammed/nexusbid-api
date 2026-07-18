import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tender } from './Tender';
import { User } from './User';

import { DownloadSource } from '@/types/enums';

/**
 * Immutable audit log of every PDF download.
 * Never updated, never deleted — append-only.
 */
@Entity('download_history')
@Check('"file_size" >= 0')
@Index('idx_downloads_user_date', ['userId', 'downloadedAt'])
@Index('idx_downloads_tender_date', ['tenderId', 'downloadedAt'])
@Index('idx_downloads_date', ['downloadedAt'])
export class DownloadHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  tenderId: string;

  @ManyToOne(() => Tender, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 255, nullable: true, default: null })
  storageKey: string | null;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true, default: null })
  mimeType: string | null;

  @Column({ type: 'inet', nullable: true, default: null })
  ipAddress: string | null;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  downloadedAt: Date;

  @Column({
    name: 'download_source',
    type: 'enum',
    enum: DownloadSource,
  })
  source: DownloadSource;
}
