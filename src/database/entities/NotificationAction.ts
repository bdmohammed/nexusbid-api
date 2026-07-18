import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Notification } from './Notification';

import { NotificationActionType } from '@/types/enums';

@Entity('notification_actions')
export class NotificationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'enum', enum: NotificationActionType })
  type: NotificationActionType;

  @Column({ type: 'jsonb', nullable: true, default: null })
  payload: Record<string, unknown> | null;

  @Column({
    name: 'required_permission_key',
    type: 'varchar',
    length: 100,
    nullable: true,
    default: null,
  })
  requiredPermissionKey: string | null;

  @Column({ name: 'btn_order', type: 'integer', default: 0 })
  btnOrder: number;

  @ManyToOne(() => Notification, (n) => n.actions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;
}
