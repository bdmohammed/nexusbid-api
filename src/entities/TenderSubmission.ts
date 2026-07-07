import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenderParticipant } from './TenderParticipant';
import { TenderEvaluation } from './TenderEvaluation';

@Entity('tender_submissions')
export class TenderSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_participant_id', type: 'uuid' })
  tenderParticipantId: string;

  @ManyToOne(() => TenderParticipant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_participant_id' })
  participant: TenderParticipant;

  @Column({ name: 'document_version', type: 'int', default: 1 })
  documentVersion: number;

  @Column({ name: 'bid_amount_cents', type: 'bigint', transformer: {
    to: (val: number | null) => val,
    from: (val: string | null) => val ? parseInt(val, 10) : null
  }})
  bidAmountCents: number;

  @Column({ name: 'technical_proposal_url', type: 'text', nullable: true })
  technicalProposalUrl: string | null;

  @Column({ name: 'financial_proposal_url', type: 'text', nullable: true })
  financialProposalUrl: string | null;

  @Column({ type: 'varchar', length: 50, default: 'SUBMITTED' })
  status: 'SUBMITTED' | 'WITHDRAWN' | 'EVALUATION_COMPLETED';

  @CreateDateColumn({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @OneToMany(() => TenderEvaluation, (evalRow) => evalRow.submission)
  evaluations: TenderEvaluation[];
}
