import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from './Role';
import { RoleReview } from './RoleReview';
import { RoleVersionPermission } from './RoleVersionPermission';
import { User } from './User';

import { RoleVersionStatus } from '@/types/enums';

@Entity('role_versions')
@Unique(['roleId', 'version'])
@Index('idx_role_versions_role_id', ['roleId'])
@Index('idx_role_versions_status', ['status'])
@Index('ux_role_versions_active', ['roleId'], {
  unique: true,
  where: '"status" = \'APPROVED\'',
})
export class RoleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'enum', enum: RoleVersionStatus })
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

  @Column({ name: 'approved_by', type: 'uuid', nullable: true, default: null })
  approvedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true, default: null })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ───────────────────────────────────────────────────────────
  @OneToMany(() => RoleVersionPermission, (rvp) => rvp.roleVersion)
  roleVersionPermissions: RoleVersionPermission[];

  @OneToMany(() => RoleReview, (rr) => rr.roleVersion)
  reviews: RoleReview[];
}
