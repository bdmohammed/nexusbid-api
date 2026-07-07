import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { NotificationRecipient } from './NotificationRecipient';
import { NotificationAction } from './NotificationAction';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 50 })
  severity: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ name: 'action_url', type: 'varchar', length: 255, nullable: true })
  actionUrl: string | null;

  @Column({ name: 'action_label', type: 'varchar', length: 100, nullable: true })
  actionLabel: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => NotificationRecipient, (r) => r.notification, { cascade: true })
  recipients: NotificationRecipient[];

  @OneToMany(() => NotificationAction, (a) => a.notification, { cascade: true })
  actions: NotificationAction[];
}
