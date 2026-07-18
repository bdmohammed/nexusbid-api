import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TransactionStatus, TransactionType } from '../../types/enums';

import { User } from './User';

@Entity('transactions')
@Index('idx_txn_user_created', ['userId', 'createdAt'])
@Index('idx_txn_status', ['status'])
@Index('idx_txn_type', ['type'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** SET NULL on user delete — preserve financial record */
  @Column({ name: 'user_id', type: 'uuid', nullable: true, default: null })
  userId: string | null;

  /** Amount in cents. $9.99 → 999 */
  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ default: 'usd', length: 10 })
  currency: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  /**
   * ID of the related entity:
   *   - subscriptions.id  (for SUBSCRIPTION type)
   *   - tenders.id        (for PER_TENDER type)
   */
  @Column({ name: 'reference_id', type: 'varchar', nullable: true, default: null })
  referenceId: string | null;

  /**
   * Type of the related entity:
   *   - subscription
   *   - tender
   */
  @Column({ name: 'reference_type', type: 'varchar', length: 100, nullable: true, default: null })
  referenceType: string | null;

  /** Payment provider: e.g. 'paypal', 'stripe' */
  @Column({ type: 'varchar', length: 100, default: 'paypal' })
  provider: string;

  /** Provider transaction ID — UNIQUE for idempotency. Never process the same transaction twice. */
  @Index('ux_txn_provider_trans_id', { unique: true })
  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255 })
  providerTransactionId: string;

  /** Provider reference ID — required for refunds or captures (e.g. PayPal capture ID, Stripe charge ID) */
  @Column({
    name: 'provider_reference_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  providerReferenceId: string | null;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.CREATED })
  status: TransactionStatus;

  /** Storage key of the generated invoice PDF (e.g. S3 object key) */
  @Column({
    name: 'invoice_storage_key',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  invoiceStorageKey: string | null;

  /** Immutable snapshot of billing data (plan details, pricing, taxes, discounts) at checkout time */
  @Column({ name: 'billing_snapshot', type: 'jsonb', nullable: true, default: null })
  billingSnapshot: Record<string, unknown> | null;

  /** Raw payment provider capture API response — stored for dispute resolution */
  @Column({ name: 'provider_response', type: 'jsonb', nullable: true, default: null })
  providerResponse: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @ManyToOne(() => User, (u) => u.transactions, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
