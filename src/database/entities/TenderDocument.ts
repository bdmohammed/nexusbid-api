import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenderVersion } from './TenderVersion';
import { User } from './User';

@Entity('tender_documents')
export class TenderDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_version_id', type: 'uuid' })
  tenderVersionId: string;

  @ManyToOne(() => TenderVersion, (version) => version.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_version_id' })
  tenderVersion: TenderVersion;

  @Column({ name: 'document_type', length: 50 })
  documentType: string;

  @Column({ name: 's3_key', type: 'text' })
  documentS3Key: string;

  @Column({ name: 'bucket', type: 'text' })
  documentS3Bucket: string;

  @Column({ name: 'original_name', type: 'text' })
  documentOriginalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 150, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @Column({ name: 'virus_scan_status', length: 50, default: 'Pending' })
  virusScanStatus: string;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User | null;

  @Column({ name: 'uploaded_by_id', type: 'uuid', nullable: true })
  uploadedById: string | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
