import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Role } from './Role';
import { RoleVersion } from './RoleVersion';
import { RoleReviewAssignment } from './RoleReviewAssignment';
import { RoleReviewComment } from './RoleReviewComment';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('role_reviews')
@Index(['roleVersionId'])
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

  @ManyToOne(() => RoleVersion, (rv) => rv.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_version_id' })
  roleVersion: RoleVersion;

  @Column({ type: 'varchar', length: 50, default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RoleReviewAssignment, (rra) => rra.review)
  assignments: RoleReviewAssignment[];

  @OneToMany(() => RoleReviewComment, (rrc) => rrc.review)
  comments: RoleReviewComment[];
}
