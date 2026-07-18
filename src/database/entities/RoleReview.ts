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

import { Role } from './Role';
import { RoleReviewAssignment } from './RoleReviewAssignment';
import { RoleReviewComment } from './RoleReviewComment';
import { RoleVersion } from './RoleVersion';

import { ReviewStatus } from '@/types/enums';

@Entity('role_reviews')
@Index(['roleVersionId'])
@Index('ux_role_review_pending', ['roleVersionId'], {
  unique: true,
  where: '"status" = \'PENDING\'',
})
export class RoleReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_version_id', type: 'uuid' })
  roleVersionId: string;

  @ManyToOne(() => RoleVersion, (roleVersion) => roleVersion.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_version_id' })
  roleVersion: RoleVersion;

  @Index('idx_role_reviews_status')
  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true, default: null })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RoleReviewAssignment, (roleReviewAssignment) => roleReviewAssignment.review)
  roleReviewAssignments: RoleReviewAssignment[];

  @OneToMany(() => RoleReviewComment, (roleReviewComment) => roleReviewComment.roleReview)
  roleReviewComments: RoleReviewComment[];
}
