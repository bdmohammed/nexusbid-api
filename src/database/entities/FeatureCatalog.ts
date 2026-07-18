import slugify from 'slugify';
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { FeatureValueType } from '../../types/enums';

import { User } from './User';

@Entity('feature_catalog')
@Check('"feature_key" ~ \'^[a-z0-9_.-]+$\'')
@Check('"slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'')
export class FeatureCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'feature_key', type: 'varchar', length: 100, unique: true })
  featureKey: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ name: 'display_name', length: 150 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 100 })
  category: string;

  @Column({
    name: 'value_type',
    type: 'enum',
    enum: FeatureValueType,
    default: FeatureValueType.BOOLEAN,
  })
  valueType: FeatureValueType;

  @Column({ name: 'default_value', type: 'varchar', length: 100, nullable: true })
  defaultValue: string | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Hooks ─────────────────────────────────────────────────────────────────

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.featureKey) {
      this.featureKey = this.featureKey.trim().toLowerCase();
    }
    if (this.displayName) {
      this.displayName = this.displayName.trim();
      if (!this.slug) {
        this.slug = slugify(this.displayName, {
          lower: true,
          strict: true,
          trim: true,
        });
      }
    }
  }
}
