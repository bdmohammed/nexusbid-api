import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Notification } from './Notification';
import { Role } from './Role';
import { User } from './User';

import { NotificationChannel, NotificationRecipientStatus } from '@/types/enums';

@Entity('notification_recipients')
@Index('idx_notification_recipients_user_id', ['userId'])
@Index('idx_notification_recipients_role_id', ['roleId'])
@Index('idx_notification_recipients_status', ['status'])
@Index('idx_notification_recipients_user_status_date', ['userId', 'status', 'createdAt'])
@Index('idx_notification_recipients_role_status_date', ['roleId', 'status', 'createdAt'])
export class NotificationRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, default: null })
  userId: string | null;

  @Column({ name: 'role_id', type: 'uuid', nullable: true, default: null })
  roleId: string | null;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true, default: null })
  groupName: string | null;

  @Column({
    type: 'enum',
    enum: NotificationRecipientStatus,
    default: NotificationRecipientStatus.UNREAD,
  })
  status: NotificationRecipientStatus;

  @Column({ type: 'enum', enum: NotificationChannel, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true, default: null })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true, default: null })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Notification, (n) => n.recipients, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(() => User, (user) => user.receivedNotifications, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => Role, (role) => role.receivedNotifications, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;
}
