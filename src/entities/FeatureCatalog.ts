import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('feature_catalog')
export class FeatureCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'feature_key', type: 'varchar', length: 100, unique: true })
  featureKey: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
