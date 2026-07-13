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
  VersionColumn,
} from "typeorm";
import { TenderVersion } from "./TenderVersion";
import { AlertPreference } from "./AlertPreference";
import { User } from "./User";
import { CategoryVersion } from "./CategoryVersion";
import { CategoryStatus } from "../../types/enums";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Unique generated category code e.g. 'CAT-000001' */
  @Column({ length: 20, unique: true })
  code: string;

  @Column({
    type: "varchar",
    length: 50,
    default: CategoryStatus.INACTIVE,
  })
  status: CategoryStatus;

  @Column({
    name: "active_version_id",
    type: "uuid",
    nullable: true,
    default: null,
  })
  activeVersionId: string | null;

  @ManyToOne(() => CategoryVersion, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "active_version_id" })
  activeVersion: CategoryVersion | null;

  @Column({ name: "parent_id", type: "uuid", nullable: true, default: null })
  parentId: string | null;

  @ManyToOne(() => Category, (c) => c.children, { onDelete: "SET NULL" })
  @JoinColumn({ name: "parent_id" })
  parent: Category | null;

  @OneToMany(() => Category, (c) => c.parent)
  children: Category[];

  @Column({ type: "int", default: 0 })
  level: number;

  @Column({ type: "varchar", length: 1000, nullable: true, default: null })
  path: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @Column({ name: "tender_count", type: "int", default: 0 })
  tenderCount: number;

  @Column({ name: "children_count", type: "int", default: 0 })
  childrenCount: number;

  @Column({ name: "active_children", type: "int", default: 0 })
  activeChildren: number;

  @Column({ name: "is_system", type: "boolean", default: false })
  isSystem: boolean;

  @Column({ name: "display_order", type: "int", default: 0 })
  displayOrder: number;

  @Column({ type: "varchar", length: 100, nullable: true, default: null })
  icon: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, default: null })
  color: string | null;

  @VersionColumn({ name: "db_version", default: 1 })
  dbVersion: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  createdByUser?: User | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedByUser?: User | null;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "approved_by" })
  approvedByUser?: User | null;

  @Column({ name: "approved_by", type: "uuid", nullable: true })
  approvedBy?: string | null;

  @OneToMany(() => TenderVersion, (t) => t.category)
  tenders: TenderVersion[];

  @OneToMany(() => AlertPreference, (a) => a.category)
  alertPreferences: AlertPreference[];

  @OneToMany(() => CategoryVersion, (cv) => cv.category)
  versions: CategoryVersion[];

  // Dynamic values parsed on requests
  activeTenderCount?: number;
}
