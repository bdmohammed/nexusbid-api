import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SubscriptionStatus } from '../../types/enums';

import { Category } from './Category';
import { Coupon } from './Coupon';
import { PlanVersion } from './PlanVersion';
import { State } from './State';
import { User } from './User';

@Entity('subscriptions')
@Index('idx_subs_user_status', ['userId', 'status'])
@Index('idx_subs_end_status', ['endDate', 'status'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'plan_version_id', type: 'uuid' })
  planVersionId: string;

  @Column({ name: 'coupon_id', type: 'uuid', nullable: true })
  couponId: string | null;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  /**
   * PayPal Subscriptions API ID (I-XXXXXXXXXXXX).
   * Set for recurring plans — used to cancel, suspend, or query the subscription.
   */
  @Column({ name: 'paypal_subscription_id', type: 'varchar', nullable: true, default: null })
  paypalSubscriptionId: string | null;

  /**
   * PayPal Orders API order ID.
   * Set for one-time (non-recurring) plan purchases.
   */
  @Column({ name: 'paypal_order_id', type: 'varchar', nullable: true, default: null })
  paypalOrderId: string | null;

  @Column({ name: 'target_state_id', type: 'smallint', nullable: true })
  targetStateId: number | null;

  @Column({ name: 'target_country', type: 'varchar', length: 100, nullable: true })
  targetCountry: string | null;

  @Column({ name: 'target_category_id', type: 'uuid', nullable: true })
  targetCategoryId: string | null;

  @Column({ name: 'selected_category_ids', type: 'jsonb', nullable: true })
  selectedCategoryIds: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────

  @ManyToOne(() => PlanVersion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_version_id' })
  planVersion: PlanVersion;

  @ManyToOne(() => Coupon, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon | null;

  @ManyToOne(() => State, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_state_id' })
  targetState: State | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_category_id' })
  targetCategory: Category | null;
}
