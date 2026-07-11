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

import { RoleVersion } from './RoleVersion';
import { User } from './User';
import { UserRole } from './UserRole';

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('roles')
@Index(['slug'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, default: RoleStatus.ACTIVE })
  status: RoleStatus;

  @Column({ name: 'is_system_role', type: 'boolean', default: false })
  isSystemRole: boolean;

  @Column({ name: 'is_default_role', type: 'boolean', default: false })
  isDefaultRole: boolean;

  @Column({ name: 'active_version_id', type: 'uuid', nullable: true, default: null })
  activeVersionId: string | null;

  @ManyToOne(() => RoleVersion, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion: RoleVersion | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'created_by',
    referencedColumnName: 'id',
  })
  createdBy?: User | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'updated_by',
    referencedColumnName: 'id',
  })
  updatedBy?: User | null;

  // ─── Relations ───────────────────────────────────────────────────────────
  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];

  @OneToMany(() => RoleVersion, (rv) => rv.role)
  versions: RoleVersion[];
}
