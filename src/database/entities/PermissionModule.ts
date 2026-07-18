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

import { Permission } from './Permission';
import { User } from './User';

@Entity('permission_modules')
export class PermissionModule {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index(['permission_modules_key_idx'])
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'is_system_module', type: 'boolean', default: false })
  isSystemModule: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: false })
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

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
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
  @OneToMany(() => Permission, (p) => p.module)
  permissions: Permission[];
}
