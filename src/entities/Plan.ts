import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PlanVersion } from './PlanVersion';
import { Subscription } from './Subscription';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reference_no', type: 'varchar', length: 100, unique: true })
  referenceNo: string;

  @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  activeVersionId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: 'ACTIVE' | 'ARCHIVED';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => PlanVersion, (v) => v.plan)
  versions: PlanVersion[];

  @ManyToOne(() => PlanVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion: PlanVersion | null;

  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions: Subscription[];
}
