import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tender } from './Tender';
import { User } from './User';

/**
 * Immutable audit log of every PDF download.
 * Never updated, never deleted — append-only.
 */
@Entity('download_history')
@Index('idx_downloads_user_date', ['userId', 'downloadedAt'])
export class DownloadHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, default: null })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  tenderId: string | null;

  @Column()
  fileName: string;

  @Column({ nullable: true, default: null, type: 'int' })
  fileSize: number | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  downloadedAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User | null;

  @ManyToOne(() => Tender, { onDelete: 'SET NULL', nullable: true })
  tender: Tender | null;
}
