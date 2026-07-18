import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './User';

import { DashboardTheme } from '@/types/enums';

export interface DashboardWidget {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed?: boolean;
}

@Entity('user_dashboard_layouts')
@Index('ux_user_dashboard_layouts_user_id', ['userId'], { unique: true })
export class UserDashboardLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, (user) => user.userDashboardLayout, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'widgets', type: 'jsonb', default: () => "'[]'::jsonb" })
  widgets: DashboardWidget[];

  @Column({ name: 'filters', type: 'jsonb', default: () => "'{}'::jsonb" })
  filters: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: DashboardTheme,
    default: DashboardTheme.DEFAULT,
  })
  theme: DashboardTheme;

  @Column({ name: 'layout_version', type: 'integer', default: 1 })
  layoutVersion: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
