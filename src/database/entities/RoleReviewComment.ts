import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ReviewAction } from '../../types/enums';

import { RoleReview } from './RoleReview';
import { User } from './User';

@Entity('role_review_comments')
@Index('idx_role_review_comments_review_id', ['reviewId', 'createdAt'])
export class RoleReviewComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string;

  @ManyToOne(() => RoleReview, (roleReview) => roleReview.roleReviewComments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  roleReview: RoleReview;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ReviewAction })
  action: ReviewAction;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
