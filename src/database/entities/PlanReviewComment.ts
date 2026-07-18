import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PlanReview } from './PlanReview';
import { User } from './User';

import { ReviewAction } from '@/types/enums';

@Entity('plan_review_comments')
@Index('idx_plan_review_comments_review_created', ['planReviewId', 'createdAt'])
@Index('idx_plan_review_comments_author', ['authorId'])
export class PlanReviewComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_review_id', type: 'uuid' })
  planReviewId: string;

  @Column({
    type: 'enum',
    enum: ReviewAction,
  })
  action: ReviewAction;

  @ManyToOne(() => PlanReview, (planReview) => planReview.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_review_id' })
  planReview: PlanReview;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'comment_text', type: 'text' })
  commentText: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
