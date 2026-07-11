import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PlanVersion } from './PlanVersion';

@Entity('plan_country_pricing')
export class PlanCountryPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_version_id', type: 'uuid' })
  planVersionId: string;

  @ManyToOne(() => PlanVersion, (v) => v.countryPricing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_version_id' })
  planVersion: PlanVersion;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
