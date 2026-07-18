import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { NotificationAction } from './NotificationAction';
import { NotificationRecipient } from './NotificationRecipient';
import { User } from './User';

import { NotificationCategory, NotificationSeverity } from '@/types/enums';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ type: 'enum', enum: NotificationSeverity })
  severity: NotificationSeverity;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true, default: null })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true, default: null })
  entityId: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true, default: null })
  expiresAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sender_id', type: 'uuid', nullable: true, default: null })
  senderUserId: string | null;

  @ManyToOne(() => User, (user) => user.sentNotifications, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'sender_id' })
  senderUser: User | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => NotificationRecipient, (r) => r.notification, { cascade: true })
  recipients: NotificationRecipient[];

  @OneToMany(() => NotificationAction, (a) => a.notification, { cascade: true })
  actions: NotificationAction[];
}
