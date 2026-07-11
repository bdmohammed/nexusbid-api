import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('traffic_daily_metrics')
@Index(['date'])
export class TrafficDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browser: string | null;

  @Column({ name: 'unique_visitors', type: 'integer', default: 0 })
  uniqueVisitors: number;

  @Column({ name: 'page_views', type: 'integer', default: 0 })
  pageViews: number;

  @Column({ name: 'tender_views', type: 'integer', default: 0 })
  tenderViews: number;

  @Column({ name: 'tender_downloads', type: 'integer', default: 0 })
  tenderDownloads: number;

  @Column({ name: 'searches_count', type: 'integer', default: 0 })
  searchesCount: number;
}
