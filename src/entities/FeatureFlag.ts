import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** e.g. 'email_alerts', 'ai_search', 'per_tender_purchase' */
  @Column({ unique: true })
  key: string;

  /** Human-readable description shown in admin UI */
  @Column()
  label: string;

  @Column({ default: false })
  enabled: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
