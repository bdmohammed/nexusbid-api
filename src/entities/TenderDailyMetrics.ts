import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('tender_daily_metrics')
@Index(['date'])
@Index(['date', 'country', 'categoryId'])
export class TenderDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'tender_type', type: 'varchar', length: 100, nullable: true })
  tenderType: string | null;

  @Column({ name: 'tender_status', type: 'varchar', length: 100, nullable: true })
  tenderStatus: string | null;

  @Column({ name: 'procurement_type', type: 'varchar', length: 100, nullable: true })
  procurementType: string | null;

  @Column({ name: 'created_count', type: 'integer', default: 0 })
  createdCount: number;

  @Column({ name: 'published_count', type: 'integer', default: 0 })
  publishedCount: number;

  @Column({ name: 'awarded_count', type: 'integer', default: 0 })
  awardedCount: number;

  @Column({ name: 'cancelled_count', type: 'integer', default: 0 })
  cancelledCount: number;

  @Column({ name: 'total_budget', type: 'numeric', precision: 18, scale: 2, default: 0.00, transformer: {
    to: (val: number) => val,
    from: (val: string) => parseFloat(val)
  }})
  totalBudget: number;

  @Column({ name: 'average_evaluation_time_seconds', type: 'numeric', precision: 12, scale: 2, default: 0.00, transformer: {
    to: (val: number) => val,
    from: (val: string) => parseFloat(val)
  }})
  averageEvaluationTimeSeconds: number;

  @Column({ name: 'average_award_time_seconds', type: 'numeric', precision: 12, scale: 2, default: 0.00, transformer: {
    to: (val: number) => val,
    from: (val: string) => parseFloat(val)
  }})
  averageAwardTimeSeconds: number;

  @Column({ name: 'bid_count', type: 'integer', default: 0 })
  bidCount: number;
}
