import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Plan } from './Plan';
import { State } from './State';
import { Category } from './Category';
import { User } from './User';
import { PlanFeature } from './PlanFeature';
import { PlanCountryPricing } from './PlanCountryPricing';
import { PlanCategoryPricing } from './PlanCategoryPricing';
import { PlanReview } from './PlanReview';

@Entity('plan_versions')
export class PlanVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan, (p) => p.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED';

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ type: 'text', nullable: true })
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

  @Column({ type: 'varchar', length: 50, nullable: true })
  badge: string | null;

  @Column({ name: 'plan_type', type: 'varchar', length: 50, default: 'all-access' })
  planType: 'all-access' | 'state' | 'country' | 'category' | 'bundle';

  @Column({ name: 'target_state_id', type: 'uuid', nullable: true })
  targetStateId: string | null;

  @ManyToOne(() => State, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_state_id' })
  targetState: State | null;

  @Column({ name: 'target_country', type: 'varchar', length: 100, nullable: true })
  targetCountry: string | null;

  @Column({ name: 'target_category_id', type: 'uuid', nullable: true })
  targetCategoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_category_id' })
  targetCategory: Category | null;

  @Column({ name: 'bundle_size', type: 'int', nullable: true })
  bundleSize: number | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

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
