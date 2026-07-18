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

import { Country } from './Country';
import { User } from './User';

@Entity('user_daily_metrics')
@Index(['date'])
@Index(['date', 'countryId'])
export class UserDailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ name: 'country_id', type: 'smallint', nullable: true, default: null })
  countryId: number | null;

  @ManyToOne(() => Country, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  country: Country | null;

  @Column({ name: 'new_users', type: 'integer', default: 0 })
  newUsers: number;

  @Column({ name: 'active_users', type: 'integer', default: 0 })
  activeUsers: number;

  @Column({ name: 'verified_users', type: 'integer', default: 0 })
  verifiedUsers: number;

  @Column({ name: 'blocked_users', type: 'integer', default: 0 })
  blockedUsers: number;

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
