import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('evaluation_templates')
export class EvaluationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'default_weight', type: 'numeric', precision: 5, scale: 2, default: 0.00, transformer: {
    to: (val: number) => val,
    from: (val: string) => parseFloat(val)
  }})
  defaultWeight: number;

  @Column({ name: 'max_score', type: 'int', default: 100 })
  maxScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
