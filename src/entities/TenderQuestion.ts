import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tender } from './Tender';
import { User } from './User';

@Entity('tender_questions')
export class TenderQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_id', type: 'uuid' })
  tenderId: string;

  @ManyToOne(() => Tender, (tender) => tender.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answerText: string | null;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'answered_by_id' })
  answeredBy: User | null;

  @Column({ name: 'answered_by_id', type: 'uuid', nullable: true })
  answeredById: string | null;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
