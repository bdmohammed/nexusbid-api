import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BrowserType, DeviceType } from '../../types/enums';

import { Country } from './Country';

@Entity('traffic_daily_metrics')
@Index('ux_traffic_daily_metrics', ['date', 'countryId', 'device', 'browser'], { unique: true })
@Index(['countryId'])
@Index(['date', 'countryId'])
export class TrafficDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({
    name: 'country_id',
    type: 'smallint',
    nullable: true,
    default: null,
  })
  countryId: number | null;

  @ManyToOne(() => Country, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'country_id' })
  country: Country | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: DeviceType.DESKTOP,
  })
  device: DeviceType | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: BrowserType.OTHER,
  })
  browser: BrowserType | null;

  // ─── Visitors ──────────────────────────────────────────────────────────────
  @Column({ name: 'unique_visitors', type: 'integer', default: 0 })
  uniqueVisitors: number;

  @Column({ name: 'new_visitors', type: 'integer', default: 0 })
  newVisitors: number;

  @Column({ name: 'returning_visitors', type: 'integer', default: 0 })
  returningVisitors: number;

  // ─── Engagement ────────────────────────────────────────────────────────────
  @Column({ name: 'page_views', type: 'integer', default: 0 })
  pageViews: number;

  @Column({ name: 'tender_views', type: 'integer', default: 0 })
  tenderViews: number;

  @Column({ name: 'search_count', type: 'integer', default: 0 })
  searchCount: number;

  @Column({ name: 'avg_session_duration_seconds', type: 'integer', default: 0 })
  avgSessionDuration: number;

  @Column({
    name: 'bounce_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(val),
    },
  })
  bounceRate: number;

  // ─── Conversions ───────────────────────────────────────────────────────────
  @Column({ name: 'signup_count', type: 'integer', default: 0 })
  signupCount: number;

  @Column({ name: 'subscription_count', type: 'integer', default: 0 })
  subscriptionCount: number;

  @Column({
    name: 'revenue_cents',
    type: 'bigint',
    default: 0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseInt(val, 10),
    },
  })
  revenue: number;

  // ─── Downloads ─────────────────────────────────────────────────────────────
  @Column({ name: 'tender_downloads', type: 'integer', default: 0 })
  tenderDownloads: number;

  // ─── Operations ────────────────────────────────────────────────────────────
  @Column({ name: 'api_requests', type: 'integer', default: 0 })
  apiRequests: number;

  @Column({ name: 'error_count', type: 'integer', default: 0 })
  errorCount: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
