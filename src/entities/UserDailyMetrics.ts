import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_daily_metrics')
@Index(['date'])
export class UserDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ name: 'new_users', type: 'integer', default: 0 })
  newUsers: number;

  @Column({ name: 'active_users', type: 'integer', default: 0 })
  activeUsers: number;

  @Column({ name: 'verified_users', type: 'integer', default: 0 })
  verifiedUsers: number;

  @Column({ name: 'blocked_users', type: 'integer', default: 0 })
  blockedUsers: number;
}
