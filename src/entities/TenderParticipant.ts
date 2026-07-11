import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tender } from './Tender';
import { TenderEvaluation } from './TenderEvaluation';
import { User } from './User';

@Entity('tender_participants')
export class TenderParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_id', type: 'uuid' })
  tenderId: string;

  @ManyToOne(() => Tender, (tender) => tender.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({ length: 50 })
  status: string;

  @Column({ name: 'submission_version', type: 'int', nullable: true })
  submissionVersion: number | null;

  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true })
  withdrawnAt: Date | null;

  @Column({ name: 'evaluation_completed', default: false })
  evaluationCompleted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => TenderEvaluation, (evalRow) => evalRow.participant)
  evaluations: TenderEvaluation[];
}
