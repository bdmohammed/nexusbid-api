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

import { State } from './State';
import { TenderDailyMetrics } from './TenderDailyMetrics';
import { User } from './User';
import { UserDailyMetrics } from './UserDailyMetrics';

@Entity('countries')
@Check('"code" ~ \'^[A-Z]{2}$\'')
@Check('"slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'')
export class Country {
  @PrimaryGeneratedColumn('increment', {
    type: 'smallint',
  })
  id!: string;

  /** ISO 3166-1 Alpha-2 Code (IN, US, CA...) */
  @Column({
    type: 'char',
    length: 2,
    unique: true,
  })
  code!: string;

  @Index('idx_country_slug', { unique: true })
  @Column({
    length: 100,
  })
  slug!: string;

  @Column({
    length: 100,
  })
  name!: string;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

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
  @JoinColumn({
    name: 'updated_by',
  })
  updatedBy!: User | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  // ─── Relations ────────────────────────────────────────────────────────────
  @OneToMany(() => State, (state) => state.country)
  states!: State[];

  @OneToMany(() => User, (user) => user.country)
  users!: User[];

  @OneToMany(() => TenderDailyMetrics, (metrics) => metrics.country)
  tenderMetrics!: TenderDailyMetrics[];

  @OneToMany(() => UserDailyMetrics, (metrics) => metrics.country)
  userMetrics!: UserDailyMetrics[];

  // ─── Hooks ────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    this.code = this.code.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(this.code)) {
      throw new Error('Country code must be a valid ISO-3166-1 alpha-2 code.');
    }

    this.name = this.name.trim();

    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
}
