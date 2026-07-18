import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Plan } from './Plan';
import { User } from './User';

import { CouponDiscountType } from '@/types/enums';

@Entity('coupons')
@Check('"discount_value" >= 0')
@Check('"min_purchase_cents" >= 0')
@Check('"max_discount_cents" >= 0')
@Check('"max_redemptions" >= 1')
@Check('"max_redemptions_per_user" >= 1')
@Index('idx_coupons_validity', ['validFrom', 'expiresAt'])
@Index('idx_coupons_active', ['isActive'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    default: null,
  })
  description: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'discount_type', type: 'enum', enum: CouponDiscountType })
  discountType: CouponDiscountType;

  @Column({ name: 'discount_value', type: 'int' })
  discountValue: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'max_redemptions', type: 'int', nullable: true, default: null })
  maxRedemptions: number | null;

  @Column({ name: 'redemption_count', type: 'int', default: 0 })
  redemptionCount: number;

  @Column({ name: 'max_redemptions_per_user', type: 'int', nullable: true, default: null })
  maxRedemptionsPerUser: number | null;

  @Column({ name: 'min_purchase_cents', type: 'int', nullable: true, default: null })
  minPurchaseCents: number | null;

  @Column({ name: 'max_discount_cents', type: 'int', nullable: true, default: null })
  maxDiscountCents: number | null;

  @Column({ name: 'first_purchase_only', type: 'boolean', default: false })
  firstPurchaseOnly: boolean;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true, default: null })
  validFrom: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true, default: null })
  expiresAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt: Date | null;

  // ─── Relations ────────────────────────────────────────────────────────────
  @ManyToMany(() => Plan)
  @JoinTable({
    name: 'coupon_plan_restrictions',
    joinColumn: { name: 'coupon_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'plan_id', referencedColumnName: 'id' },
  })
  restrictedPlans: Plan[];
}
