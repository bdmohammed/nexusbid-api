import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Category } from './Category';
import { Plan } from './Plan';
import { PlanCategoryPricing } from './PlanCategoryPricing';
import { PlanCountryPricing } from './PlanCountryPricing';
import { PlanFeature } from './PlanFeature';
import { PlanReview } from './PlanReview';
import { State } from './State';
import { User } from './User';

import { PlanType, PlanVersionStatus } from '@/types/enums';

@Entity('plan_versions')
@Unique(['planId', 'version'])
@Index('idx_plan_versions_plan_id', ['planId'])
@Index('idx_plan_versions_status', ['status'])
@Index('ux_plan_versions_active', ['planId'], {
  unique: true,
  where: '"status" = \'APPROVED\'',
})
export class PlanVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan, (p) => p.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'enum', enum: PlanVersionStatus })
  status: PlanVersionStatus;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  subtitle: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays: number;

  @Column({ name: 'setup_fee_cents', type: 'int', default: 0 })
  setupFeeCents: number;

  @Column({ name: 'is_recurring', default: true })
  isRecurring: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  badge: string | null;

  @Column({ name: 'plan_type', type: 'enum', enum: PlanType, default: PlanType.ALL_ACCESS })
  planType: PlanType;

  @Column({ name: 'target_state_id', type: 'smallint', nullable: true, default: null })
  targetStateId: number | null;

  @ManyToOne(() => State, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_state_id' })
  targetState: State | null;

  @Column({ name: 'target_country', type: 'varchar', length: 100, nullable: true, default: null })
  targetCountry: string | null;

  @Column({ name: 'target_category_id', type: 'uuid', nullable: true, default: null })
  targetCategoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_category_id' })
  targetCategory: Category | null;

  @Column({ name: 'bundle_size', type: 'int', nullable: true, default: null })
  bundleSize: number | null;

  @Column({ name: 'locked_by', type: 'uuid', nullable: true, default: null })
  lockedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locked_by' })
  lockedByUser: User | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true, default: null })
  lockedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdBy: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true, default: null })
  approvedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true, default: null })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => PlanFeature, (f) => f.planVersion)
  features: PlanFeature[];

  @OneToMany(() => PlanCountryPricing, (cp) => cp.planVersion)
  countryPricing: PlanCountryPricing[];

  @OneToMany(() => PlanCategoryPricing, (catP) => catP.planVersion)
  categoryPricing: PlanCategoryPricing[];

  @OneToMany(() => PlanReview, (r) => r.planVersion)
  reviews: PlanReview[];
}
