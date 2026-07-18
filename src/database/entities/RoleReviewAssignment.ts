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

import { ReviewAssignmentStatus } from '@/types/enums';

@Entity('role_review_assignments')
@Unique(['reviewId', 'reviewerId'])
@Index(['reviewerId'])
@Index('idx_role_review_assignment_review_status', ['reviewId', 'status'])
export class RoleReviewAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @ManyToOne(() => RoleReview, (r) => r.roleReviewAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: RoleReview;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ type: 'enum', enum: ReviewAssignmentStatus, default: ReviewAssignmentStatus.PENDING })
  status: ReviewAssignmentStatus;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true, default: null })
  reviewedAt: Date | null;
}
