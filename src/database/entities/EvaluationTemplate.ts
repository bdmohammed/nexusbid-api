import slugify from 'slugify';
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TenderEvaluation } from './TenderEvaluation';
import { User } from './User';

@Entity('evaluation_templates')
@Check('"default_weight" >= 0')
@Check('"default_weight" <= 100')
@Check('"max_score" > 0')
@Check('"slug" ~ \'^[a-z0-9]+(?:-[a-z0-9]+)*$\'')
@Check('"code" ~ \'^[A-Z0-9_-]+$\'')
export class EvaluationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30, unique: true })
  code: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'default_weight',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(val),
    },
  })
  defaultWeight: number;

  @Column({ name: 'max_score', type: 'int', default: 100 })
  maxScore: number;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true, default: null })
  updatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => TenderEvaluation, (evaluation) => evaluation.evaluationTemplate)
  evaluations: TenderEvaluation[];

  // ─── Hooks ─────────────────────────────────────────────────────────────────

  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.code) {
      this.code = this.code.trim().toUpperCase();
    }
    if (this.name) {
      this.name = this.name.trim();
      if (!this.slug) {
        this.slug = slugify(this.name, {
          lower: true,
          strict: true,
          trim: true,
        });
      }
    }
  }
}
