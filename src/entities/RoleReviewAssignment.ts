import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { RoleReview } from './RoleReview';
import { User } from './User';

export enum ReviewAssignmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

@Entity('role_review_assignments')
@Unique(['reviewId', 'reviewerId'])
@Index(['reviewerId'])
export class RoleReviewAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @ManyToOne(() => RoleReview, (r) => r.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: RoleReview;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ type: 'varchar', length: 50, default: ReviewAssignmentStatus.PENDING })
  status: ReviewAssignmentStatus;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true, default: null })
  reviewedAt: Date | null;
}
