import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, type OneToMany, JoinColumn, Index } from 'typeorm';
import { PermissionModule } from './PermissionModule';

@Entity('permissions')
@Index(['key'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({
    name: 'display_order',
    type: "integer",
    default: 0,
  })
  displayOrder: number;

  @Column({
    name: 'is_active',
    type: "boolean",
    default: false,
  })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true, default: null })
  deletedAt: Date | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @ManyToOne(() => PermissionModule, (m) => m.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: PermissionModule;
}
