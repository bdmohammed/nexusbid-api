import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenderVersion } from './TenderVersion';
import { AlertPreference } from './AlertPreference';
import { User } from './User';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** ISO code: 'CA', 'TX', 'US-FED' for federal opportunities */
  @Column({ length: 20, unique: true })
  code!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, unique: true })
  slug!: string;

  /** 'state' | 'territory' | 'federal' */
  @Column({ length: 20 })
  type!: string;

  @Column({ length: 100, default: 'United States' })
  country!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ✅ Soft delete is correctly typed with ? and | null, so no ! needed here
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  // ✅ Audit relations are correctly typed with ? and | null
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: User | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => TenderVersion, (t) => t.state)
  tenders!: TenderVersion[];

  @OneToMany(() => AlertPreference, (a) => a.state)
  alertPreferences!: AlertPreference[];
}