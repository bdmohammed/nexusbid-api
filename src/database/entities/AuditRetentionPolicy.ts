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

import { RetentionCategory } from '@/types/enums';

@Entity('audit_retention_policies')
@Check('"retention_days" BETWEEN 1 AND 36500')
@Index('idx_retention_category_enabled', ['category', 'enabled'])
export class AuditRetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'enum', enum: RetentionCategory })
  category: RetentionCategory;

  @Column({ name: 'retention_days', type: 'integer' })
  retentionDays: number;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
