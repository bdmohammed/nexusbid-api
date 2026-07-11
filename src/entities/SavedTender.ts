import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Tender } from './Tender';
import { User } from './User';

@Entity('saved_tenders')
@Unique('uq_saved_tenders_user_tender', ['userId', 'tenderId'])
export class SavedTender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  tenderId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  savedAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Tender, { onDelete: 'CASCADE' })
  tender: Tender;
}
