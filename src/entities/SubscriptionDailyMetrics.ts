import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subscription_daily_metrics')
@Index(['date'])
export class SubscriptionDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'active_count', type: 'integer', default: 0 })
  activeCount: number;

  @Column({ name: 'expired_count', type: 'integer', default: 0 })
  expiredCount: number;

  @Column({ name: 'cancelled_count', type: 'integer', default: 0 })
  cancelledCount: number;

  @Column({
    name: 'revenue_cents',
    type: 'bigint',
    default: 0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseInt(val, 10),
    },
  })
  revenueCents: number;
}
