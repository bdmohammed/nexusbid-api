import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { TransactionType, TransactionStatus } from "../../types/enums";
import { User } from "./User";

@Entity("transactions")
@Index("idx_txn_user_created", ["userId", "createdAt"])
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** SET NULL on user delete — preserve financial record */
  @Column({ nullable: true, default: null })
  userId: string | null;

  /** Amount in cents. $9.99 → 999 */
  @Column({ type: "int" })
  amountCents: number;

  @Column({ default: "usd", length: 10 })
  currency: string;

  @Column({ type: "enum", enum: TransactionType })
  type: TransactionType;

  /**
   * ID of the related entity:
   *   - subscriptions.id  (for SUBSCRIPTION type)
   *   - tenders.id        (for PER_TENDER type)
   */
  @Column({ type: "varchar", nullable: true, default: null })
  referenceId: string | null;

  /** PayPal order ID — UNIQUE for idempotency. Never process the same order twice. */
  @Column({ unique: true })
  paypalOrderId: string;

  /** PayPal capture ID — required for refunds */
  @Column({ type: "varchar", nullable: true, default: null })
  paypalCaptureId: string | null;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.CREATED,
  })
  status: TransactionStatus;

  @Column({ type: "varchar", nullable: true, default: null })
  invoiceUrl: string | null;

  /** Raw PayPal capture API response — stored for dispute resolution */
  @Column({ type: "jsonb", nullable: true, default: null })
  paypalResponse: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @ManyToOne(() => User, (u) => u.transactions, {
    onDelete: "SET NULL",
    nullable: true,
  })
  user: User | null;
}
