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

import { Category } from './Category';
import { Country } from './Country';
import { Tender } from './Tender';
import { User } from './User';

@Entity('tender_daily_metrics')
@Index(['date'])
@Index(['date', 'countryId', 'categoryId'])
export class TenderDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ name: 'country_id', type: 'smallint', nullable: true, default: null })
  countryId: number | null;

  @ManyToOne(() => Country, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  country: Country | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true, default: null })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ name: 'tender_id', type: 'uuid', nullable: true, default: null })
  tenderId: string | null;

  @ManyToOne(() => Tender, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender | null;

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

  @Column({
    name: 'total_budget',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(val),
    },
  })
  totalBudget: number;

  @Column({
    name: 'average_evaluation_time_seconds',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(val),
    },
  })
  averageEvaluationTimeSeconds: number;

  @Column({
    name: 'average_award_time_seconds',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(val),
    },
  })
  averageAwardTimeSeconds: number;

  @Column({ name: 'bid_count', type: 'integer', default: 0 })
  bidCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
