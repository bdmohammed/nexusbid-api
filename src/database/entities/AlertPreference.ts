import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { AlertFrequency } from '../../types/enums';

import { Category } from './Category';
import { State } from './State';
import { User } from './User';

@Entity('alert_preferences')
@Index('idx_alert_preferences_user', ['userId'])
@Index('idx_alert_preferences_category', ['categoryId'])
@Index('idx_alert_preferences_state', ['stateId'])
@Index('idx_alert_preferences_frequency', ['frequency'])
@Index('idx_alert_preferences_user_frequency', ['userId', 'frequency'])
@Unique(['userId', 'categoryId', 'stateId', 'keyword'])
export class AlertPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Match tenders in this category. Null = any category. */
  @Column({ type: 'uuid', nullable: true, default: null })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  category: Category | null;

  /** Match tenders in this state. Null = any state. */
  @Column({ type: 'smallint', nullable: true, default: null })
  stateId: number | null;

  @ManyToOne(() => State, { onDelete: 'SET NULL', nullable: true })
  state: State | null;

  /** Optional keyword filter applied to title/description */
  @Column({ type: 'varchar', length: 150, nullable: true, default: null })
  keyword: string | null;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  @Column({ type: 'enum', enum: AlertFrequency, default: AlertFrequency.DAILY })
  frequency: AlertFrequency;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true, default: null })
  lastSentAt: Date | null;

  @Column({ name: 'email_sent_count', type: 'int', default: 0 })
  emailSentCount: number;
}
