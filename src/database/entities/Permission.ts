import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PermissionActions } from '../../authorization/registry/types';

import { PermissionModule } from './PermissionModule';
import { User } from './User';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: number;

  @Index('permissions_module_id_idx')
  @Column({ name: 'module_id', type: 'smallint' })
  moduleId: number;

  @ManyToOne(() => PermissionModule, (m) => m.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: PermissionModule;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // module.key + "." + action
  @Index('permissions_key_idx')
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'enum', enum: PermissionActions })
  action: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({
    name: 'display_order',
    type: 'integer',
    default: 0,
  })
  displayOrder: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: false,
  })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedById!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'updated_by',
  })
  updatedBy!: User | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
}
