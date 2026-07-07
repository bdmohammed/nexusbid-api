import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';
import { WebhookEventStatus } from '../types/enums';

/**
 * Logs ALL incoming webhooks BEFORE processing.
 * Safety net: if processing fails you can replay from this table.
 * eventId is unique per provider — prevents duplicate processing.
 */
@Entity('webhook_events')
@Index('idx_webhook_provider_event', ['provider', 'eventId'], { unique: true })
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** e.g. 'paypal' */
  @Column()
  provider: string;

  /** PayPal transmission ID — used as idempotency key */
  @Column()
  eventId: string;

  /** e.g. 'PAYMENT.CAPTURE.COMPLETED' */
  @Column()
  eventType: string;

  /** Full raw webhook body — stored for replay capability */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: WebhookEventStatus, default: WebhookEventStatus.RECEIVED })
  status: WebhookEventStatus;

  /** Error message if status is FAILED */
  @Column({ type: 'text', nullable: true, default: null })
  error: string | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  processedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt: Date;
}
