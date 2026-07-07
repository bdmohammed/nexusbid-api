import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { TenderVersionStatus } from '../types/enums';
import { Tender } from './Tender';
import { Category } from './Category';
import { State } from './State';
import { User } from './User';
import { TenderDocument } from './TenderDocument';
import { TenderReview } from './TenderReview';

@Entity('tender_versions')
export class TenderVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_id', type: 'uuid' })
  tenderId: string;

  @ManyToOne(() => Tender, (tender) => tender.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tender_id' })
  tender: Tender;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: TenderVersionStatus.DRAFT,
  })
  status: TenderVersionStatus;

  @VersionColumn({ name: 'db_version', default: 1 })
  dbVersion: number;

  @Column({ length: 400 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'procurement_type', type: 'varchar', length: 50, nullable: true })
  procurementType: string | null;

  @Column({ length: 50, default: 'Medium' })
  priority: string;

  @Column({ name: 'estimated_budget', type: 'bigint', nullable: true, transformer: {
    to: (val: number | null) => val,
    from: (val: string | null) => val ? parseInt(val, 10) : null
  }})
  estimatedBudget: number | null;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string | null;

  @Column({ name: 'place_id', type: 'text', nullable: true })
  placeId: string | null;

  @Column({ name: 'formatted_address', type: 'text', nullable: true })
  formattedAddress: string | null;

  @Column({ name: 'site_visit_required', default: false })
  siteVisitRequired: boolean;

  @Column({ name: 'site_visit_date', type: 'timestamptz', nullable: true })
  siteVisitDate: Date | null;

  @Column({ name: 'site_visit_instructions', type: 'text', nullable: true })
  siteVisitInstructions: string | null;

  @Column({ name: 'contact_person', type: 'varchar', length: 255, nullable: true })
  contactPerson: string | null;

  @Column({ name: 'contact_designation', type: 'varchar', length: 255, nullable: true })
  contactDesignation: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'contact_alternative', type: 'varchar', length: 255, nullable: true })
  contactAlternative: string | null;

  @Column({ name: 'opening_date', type: 'timestamptz', nullable: true })
  openingDate: Date | null;

  @Column({ name: 'closing_date', type: 'timestamptz', nullable: true })
  closingDate: Date | null;

  @Column({ name: 'bid_validity', type: 'int', nullable: true })
  bidValidity: number | null;

  @Column({ name: 'project_duration', type: 'varchar', length: 100, nullable: true })
  projectDuration: string | null;

  @Column({ name: 'emd_amount', type: 'bigint', nullable: true, transformer: {
    to: (val: number | null) => val,
    from: (val: string | null) => val ? parseInt(val, 10) : null
  }})
  emdAmount: number | null;

  @Column({ name: 'security_deposit', type: 'bigint', nullable: true, transformer: {
    to: (val: number | null) => val,
    from: (val: string | null) => val ? parseInt(val, 10) : null
  }})
  securityDeposit: number | null;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ length: 50, default: 'public' })
  visibility: string;

  @Column({ name: 'evaluation_method', type: 'varchar', length: 100, nullable: true })
  evaluationMethod: string | null;

  @Column({ name: 'submission_method', type: 'varchar', length: 100, nullable: true })
  submissionMethod: string | null;

  @Column({ name: 'contract_type', type: 'varchar', length: 100, nullable: true })
  contractType: string | null;

  @Column({ name: 'procurement_method', type: 'varchar', length: 100, nullable: true })
  procurementMethod: string | null;

  @Column({ name: 'eligibility_criteria', type: 'text', nullable: true })
  eligibilityCriteria: string | null;

  @Column({ name: 'special_conditions', type: 'text', nullable: true })
  specialConditions: string | null;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => State, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'state_id' })
  state: State;

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true, default: null })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => TenderDocument, (doc) => doc.tenderVersion)
  documents: TenderDocument[];

  @OneToMany(() => TenderReview, (review) => review.tenderVersion)
  reviews: TenderReview[];
}
