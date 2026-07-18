import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Plan } from './Plan';
import { PlanReviewAssignment } from './PlanReviewAssignment';
import { PlanReviewComment } from './PlanReviewComment';
import { PlanVersion } from './PlanVersion';

import { ReviewStatus } from '@/types/enums';

@Entity('plan_reviews')
@Index(['planVersionId'])
@Index('ux_plan_review_pending', ['planVersionId'], {
  unique: true,
  where: '"status" = \'PENDING\'',
})
export class PlanReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'plan_version_id', type: 'uuid' })
  planVersionId: string;

  @ManyToOne(() => PlanVersion, (planVersion) => planVersion.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_version_id' })
  planVersion: PlanVersion;

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true, default: null })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => PlanReviewAssignment, (pra) => pra.review)
  planReviewAssignments: PlanReviewAssignment[];

  @OneToMany(() => PlanReviewComment, (c) => c.planReview)
  comments: PlanReviewComment[];
}
