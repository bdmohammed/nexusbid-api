import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_dashboard_layouts')
@Index(['userId'])
export class UserDashboardLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'widgets', type: 'jsonb', default: '[]' })
  widgets: string[];

  @Column({ name: 'filters', type: 'jsonb', default: '{}' })
  filters: Record<string, any>;

  @Column({ name: 'theme', type: 'varchar', length: 50, default: 'default' })
  theme: string;

  @Column({ name: 'favorites', type: 'jsonb', default: '[]' })
  favorites: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
