import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Tender } from './Tender';

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
