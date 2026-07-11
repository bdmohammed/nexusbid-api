import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AlertFrequency } from '../types/enums';

import { Category } from './Category';
import { State } from './State';
import { User } from './User';

@Entity('alert_preferences')
export class AlertPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  /** Match tenders in this category. Null = any category. */
  @Column({ type: 'uuid', nullable: true, default: null })
  categoryId: string | null;

  /** Match tenders in this state. Null = any state. */
  @Column({ type: 'uuid', nullable: true, default: null })
  stateId: string | null;

  /** Optional keyword filter applied to title/description */
  @Column({ type: 'varchar', nullable: true, default: null })
  keyword: string | null;

  @Column({ type: 'enum', enum: AlertFrequency, default: AlertFrequency.DAILY })
  frequency: AlertFrequency;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  category: Category | null;

  @ManyToOne(() => State, { onDelete: 'SET NULL', nullable: true })
  state: State | null;
}
