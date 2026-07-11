import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TenderReview } from './TenderReview';
import { User } from './User';

@Entity('tender_review_assignments')
export class TenderReviewAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @ManyToOne(() => TenderReview, (review) => review.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: TenderReview;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
