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
import { SubscriptionDailyMetrics } from './SubscriptionDailyMetrics';

import { PlanStatus } from '@/types/enums';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reference_no', type: 'varchar', length: 100, unique: true })
  referenceNo: string;

  @Column({ name: 'active_version_id', type: 'uuid', nullable: true })
  activeVersionId: string | null;

  @Column({ type: 'enum', enum: PlanStatus, default: PlanStatus.ACTIVE })
  status: PlanStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => PlanVersion, (v) => v.plan)
  versions: PlanVersion[];

  @ManyToOne(() => PlanVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'active_version_id' })
  activeVersion: PlanVersion | null;

  @OneToMany(() => SubscriptionDailyMetrics, (metrics) => metrics.plan)
  subscriptionMetrics: SubscriptionDailyMetrics[];
}
