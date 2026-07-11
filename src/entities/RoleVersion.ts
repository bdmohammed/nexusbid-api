import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from './Role';
import { RoleReview } from './RoleReview';
import { RoleVersionPermission } from './RoleVersionPermission';
import { User } from './User';

export enum RoleVersionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REOPENED = 'REOPENED',
}

@Entity('role_versions')
export class RoleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (r) => r.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: RoleVersionStatus.APPROVED })
  status: RoleVersionStatus;

  @Column({ name: 'locked_by', type: 'uuid', nullable: true, default: null })
  lockedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locked_by' })
  lockedByUser: User | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true, default: null })
  lockedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true, default: null })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RoleVersionPermission, (rvp) => rvp.roleVersion)
  roleVersionPermissions: RoleVersionPermission[];

  @OneToMany(() => RoleReview, (rr) => rr.roleVersion)
  reviews: RoleReview[];
}
