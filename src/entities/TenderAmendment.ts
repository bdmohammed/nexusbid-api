import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tender } from './Tender';
import { TenderVersion } from './TenderVersion';
import { User } from './User';

@Entity('tender_amendments')
export class TenderAmendment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_id', type: 'uuid' })
  tenderId: string;

  @ManyToOne(() => Tender, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @Column({ name: 'tender_version_id', type: 'uuid', nullable: true })
  tenderVersionId: string | null;

  @ManyToOne(() => TenderVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tender_version_id' })
  tenderVersion: TenderVersion | null;

  @Column({ name: 'amendment_number', type: 'int' })
  amendmentNumber: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'changed_fields', type: 'jsonb', nullable: true })
  changedFields: any;

  @Column({ name: 'effective_at', type: 'timestamptz', nullable: true })
  effectiveAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'published_by_id' })
  publishedBy: User | null;

  @Column({ name: 'published_by_id', type: 'uuid', nullable: true })
  publishedById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
