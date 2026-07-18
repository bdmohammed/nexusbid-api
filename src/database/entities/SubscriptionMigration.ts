import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PlanVersion } from './PlanVersion';
import { User } from './User';

import { SubscriptionMigrationStatus } from '@/types/enums';

@Entity('subscription_migrations')
export class SubscriptionMigration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_plan_version_id', type: 'uuid' })
  sourcePlanVersionId: string;

  @ManyToOne(() => PlanVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_plan_version_id' })
  sourceVersion: PlanVersion;

  @Column({ name: 'target_plan_version_id', type: 'uuid' })
  targetPlanVersionId: string;

  @ManyToOne(() => PlanVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_plan_version_id' })
  targetVersion: PlanVersion;

  @Column({
    type: 'enum',
    enum: SubscriptionMigrationStatus,
    default: SubscriptionMigrationStatus.PENDING,
  })
  status: SubscriptionMigrationStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
