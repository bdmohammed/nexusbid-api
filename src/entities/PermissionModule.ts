import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Permission } from './Permission';

@Entity('permission_modules')
@Index(['slug'])
export class PermissionModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  icon: string | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_system_module', type: 'boolean', default: false })
  isSystemModule: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt: Date | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => Permission, (p) => p.module)
  permissions: Permission[];
}
