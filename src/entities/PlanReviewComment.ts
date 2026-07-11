import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PlanReview } from './PlanReview';
import { User } from './User';

@Entity('plan_review_comments')
export class PlanReviewComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_review_id', type: 'uuid' })
  planReviewId: string;

  @ManyToOne(() => PlanReview, (r) => r.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_review_id' })
  review: PlanReview;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'comment_text', type: 'text' })
  commentText: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
