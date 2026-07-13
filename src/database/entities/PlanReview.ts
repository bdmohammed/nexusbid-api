import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PlanVersion } from './PlanVersion';
import { User } from './User';
import { PlanReviewComment } from './PlanReviewComment';

@Entity('plan_reviews')
export class PlanReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_version_id', type: 'uuid' })
  planVersionId: string;

  @ManyToOne(() => PlanVersion, (v) => v.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_version_id' })
  planVersion: PlanVersion;

  @Column({ type: 'varchar', length: 50, default: 'SUBMITTED' })
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';

  @Column({ name: 'assigned_reviewer_id', type: 'uuid', nullable: true })
  assignedReviewerId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_reviewer_id' })
  assignedReviewer: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => PlanReviewComment, (c) => c.review)
  comments: PlanReviewComment[];
}
