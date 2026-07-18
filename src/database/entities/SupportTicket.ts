import {
  Check,
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

import { TicketCategory, TicketPriority, TicketStatus } from '../../types/enums';

import { SupportTicketMessage } from './SupportTicketMessage';
import { User } from './User';

@Entity('support_tickets')
@Check('"status" <> \'closed\' OR "closed_at" IS NOT NULL')
@Index('idx_support_tickets_user_id', ['userId'])
@Index('idx_support_tickets_status', ['status'])
@Index('idx_support_tickets_assigned_to_id', ['assignedToId'])
@Index('idx_support_tickets_status_assigned', ['status', 'assignedToId'])
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'enum', enum: TicketCategory, default: TicketCategory.TECHNICAL })
  category: TicketCategory;

  @Column({
    name: 'updated_by',
    type: 'uuid',
  })
  updatedById!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedBy!: User;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true, default: null })
  assignedToId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true, default: null })
  updatedAt: Date | null;

  @Column({
    name: 'closed_at',
    type: 'timestamptz',
    nullable: true,
  })
  closedAt?: Date | null;

  @Column({
    name: 'last_reply_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastReplyAt?: Date | null;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => SupportTicketMessage, (m) => m.ticket)
  messages: SupportTicketMessage[];
}
