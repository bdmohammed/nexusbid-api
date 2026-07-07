import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TenderVersion } from './TenderVersion';
import { TenderReviewAssignment } from './TenderReviewAssignment';
import { TenderReviewComment } from './TenderReviewComment';

@Entity('tender_reviews')
export class TenderReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_version_id', type: 'uuid' })
  tenderVersionId: string;

  @ManyToOne(() => TenderVersion, (version) => version.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_version_id' })
  tenderVersion: TenderVersion;

  @Column({ length: 50, default: 'assigned' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => TenderReviewAssignment, (assign) => assign.review)
  assignments: TenderReviewAssignment[];

  @OneToMany(() => TenderReviewComment, (comment) => comment.review)
  comments: TenderReviewComment[];
}
