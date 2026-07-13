import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Category } from "./Category";
import { User } from "./User";
import { CategoryReview } from "./CategoryReview";

@Entity("category_versions")
export class CategoryVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "category_id", type: "uuid" })
  categoryId: string;

  @ManyToOne(() => Category, (c) => c.versions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({ type: "integer", default: 1 })
  version: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "text", nullable: true, default: null })
  description: string | null;

  @Column({ type: "varchar", length: 200 })
  slug: string;

  @Column({ name: "parent_id", type: "uuid", nullable: true, default: null })
  parentId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "parent_id" })
  parentCategory: Category | null;

  @Column({ type: "jsonb", nullable: true, default: null })
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  } | null;

  @Column({ type: "jsonb", nullable: true, default: null })
  metadata: Record<string, any> | null;

  @Column({ name: "created_by", type: "uuid", nullable: true, default: null })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by" })
  createdByUser: User | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => CategoryReview, (cr) => cr.categoryVersion)
  reviews: CategoryReview[];
}
