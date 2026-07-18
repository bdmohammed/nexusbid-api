import slugify from 'slugify';
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AlertPreference } from './AlertPreference';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { TenderVersion } from './TenderVersion';
import { User } from './User';

@Entity('categories')
@Index('idx_categories_code', ['code'], { unique: true })
@Index('idx_categories_slug', ['slug'], { unique: true })
@Index('idx_categories_active', ['isActive'])
@Check('"slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'')
@Check('"code" ~ \'^[0-9]{3}$\'')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 3-digit NAICS-style code e.g. '001'..'084' */
  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdBy: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: User | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => TenderVersion, (t) => t.category)
  tenders: TenderVersion[];

  @OneToMany(() => AlertPreference, (alertPreference) => alertPreference.categoryId)
  alertPreference: AlertPreference[];

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.category)
  tenderMetrics: TenderDailyMetrics[];

  // ─── Hooks ───────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.trim().toUpperCase();

    this.name = this.name.trim();

    if (!this.slug) {
      this.slug = slugify(this.name, {
        lower: true,
        strict: true,
        trim: true,
      });
    } else {
      this.slug = slugify(this.slug, {
        lower: true,
        strict: true,
        trim: true,
      });
    }
  }
}
