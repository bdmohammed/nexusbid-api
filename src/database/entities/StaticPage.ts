import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('static_pages')
export class StaticPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** about | terms | privacy | refund | faq | contact */
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  /** Markdown content */
  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  metaDescription: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
