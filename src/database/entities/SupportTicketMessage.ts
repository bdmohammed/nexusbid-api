import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SupportTicket } from './SupportTicket';
import { SupportTicketAttachment } from './SupportTicketAttachment';
import { User } from './User';

@Entity('support_ticket_messages')
@Index('idx_ticket_messages_ticket_id', ['ticketId'])
@Index('idx_ticket_messages_ticket_created', ['ticketId', 'createdAt'])
@Index('idx_ticket_messages_sender_id', ['senderId'])
export class SupportTicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => SupportTicket, (ticket) => ticket.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;

  @Column({ name: 'sender_id', type: 'uuid', nullable: true })
  senderId: string | null;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'sender_id' })
  sender: User | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_internal', type: 'boolean', default: false })
  isInternal: boolean;

  @Column({
    name: 'is_system',
    type: 'boolean',
    default: false,
  })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => SupportTicketAttachment, (a) => a.message)
  attachments: SupportTicketAttachment[];
}
