import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PlanVersion } from './PlanVersion';

import { FeatureValueType } from '@/types/enums';

@Entity('plan_features')
export class PlanFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_version_id', type: 'uuid' })
  planVersionId: string;

  @ManyToOne(() => PlanVersion, (v) => v.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_version_id' })
  planVersion: PlanVersion;

  @Column({ name: 'feature_key', type: 'varchar', length: 100 })
  featureKey: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({
    name: 'value_type',
    type: 'enum',
    enum: FeatureValueType,
    default: FeatureValueType.BOOLEAN,
  })
  valueType: FeatureValueType;

  @Column({ name: 'limit_value', type: 'varchar', length: 100 })
  limitValue: string;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
