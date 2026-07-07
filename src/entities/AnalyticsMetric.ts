import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('analytics_metrics')
export class AnalyticsMetric {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName: string;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'permission_required', type: 'varchar', length: 100, default: 'analytics.view' })
  permissionRequired: string;
}
