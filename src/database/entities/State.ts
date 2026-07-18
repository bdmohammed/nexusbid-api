import slugify from 'slugify';
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { StateType } from '../../types/enums';

import { AlertPreference } from './AlertPreference';
import { Country } from './Country';
import { TenderVersion } from './TenderVersion';
import { User } from './User';

@Entity('states')
@Check('"code" = UPPER("code")')
@Index('idx_states_country_id_code', ['countryId', 'code'], { unique: true })
export class State {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: string;

  /** State/region code within the country: 'CA', 'TX', 'ON', 'MP' */
  @Column({ length: 20 })
  code!: string;

  @Column({ length: 100 })
  name!: string;

  @Index('idx_states_slug', { unique: true })
  @Column({ length: 100 })
  slug!: string;

  /** 'state' | 'territory' | 'federal' */
  @Column({ type: 'enum', enum: StateType })
  type!: StateType;

  @Column({
    name: 'country_id',
    type: 'smallint',
  })
  countryId!: string;

  @ManyToOne(() => Country, (country) => country.states, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'country_id' })
  country!: Country;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({
    name: 'created_by',
    type: 'uuid',
  })
  createdById!: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedById!: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedBy!: User | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => TenderVersion, (t) => t.state)
  tenders!: TenderVersion[];

  @OneToMany(() => AlertPreference, (a) => a.state)
  alertPreferences!: AlertPreference[];

  // ─── Hooks ────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.trim().toUpperCase();

    if (!/^[A-Z0-9-]+$/.test(this.code)) {
      throw new Error('State code must contain only uppercase alphanumeric characters or hyphens.');
    }

    this.name = this.name.trim();

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
}
