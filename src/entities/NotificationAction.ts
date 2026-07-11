import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Notification } from './Notification';

@Entity('notification_actions')
export class NotificationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: any | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  permission: string | null;

  @Column({ name: 'btn_order', type: 'integer', default: 0 })
  btnOrder: number;

  @ManyToOne(() => Notification, (n) => n.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;
}
