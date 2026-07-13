import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenderParticipant } from './TenderParticipant';
import { User } from './User';
import { EvaluationTemplate } from './EvaluationTemplate';
import { TenderSubmission } from './TenderSubmission';

@Entity('tender_evaluations')
export class TenderEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @ManyToOne(() => TenderParticipant, (part) => part.evaluations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: TenderParticipant;

  @Column({ name: 'submission_id', type: 'uuid', nullable: true })
  submissionId: string | null;

  @ManyToOne(() => TenderSubmission, (sub) => sub.evaluations, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'submission_id' })
  submission: TenderSubmission | null;

  @Column({ name: 'evaluation_type', length: 50 })
  evaluationType: string;

  @Column({ name: 'evaluation_template_id', type: 'uuid', nullable: true })
  evaluationTemplateId: string | null;

  @ManyToOne(() => EvaluationTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'evaluation_template_id' })
  evaluationTemplate: EvaluationTemplate | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.00, transformer: {
    to: (val: number) => val,
    from: (val: string) => parseFloat(val)
  }})
  weight: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.00, transformer: {
    to: (val: number) => val,
    from: (val: string) => parseFloat(val)
  }})
  score: number;

  @Column({ name: 'max_score', type: 'int', default: 100 })
  maxScore: number;

  @Column({ default: true })
  passed: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'evaluated_by_id' })
  evaluatedBy: User | null;

  @Column({ name: 'evaluated_by_id', type: 'uuid', nullable: true })
  evaluatedById: string | null;

  @CreateDateColumn({ name: 'evaluated_at', type: 'timestamptz' })
  evaluatedAt: Date;
}
