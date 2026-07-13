import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Category } from "./Category";
import { CategoryVersion } from "./CategoryVersion";
import { CategoryReviewAssignment } from "./CategoryReviewAssignment";
import { CategoryReviewComment } from "./CategoryReviewComment";
import { CategoryReviewStatus, ReviewPolicy } from "../../types/enums";

@Entity("category_reviews")
@Index(["categoryVersionId"])
export class CategoryReview {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "category_id", type: "uuid" })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: "CASCADE" })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({ name: "category_version_id", type: "uuid" })
  categoryVersionId: string;

  @ManyToOne(() => CategoryVersion, (cv) => cv.reviews, { onDelete: "CASCADE" })
  @JoinColumn({ name: "category_version_id" })
  categoryVersion: CategoryVersion;

  @Column({
    type: "varchar",
    length: 50,
    default: CategoryReviewStatus.PENDING,
  })
  status: CategoryReviewStatus;

  @Column({
    type: "varchar",
    length: 50,
    default: ReviewPolicy.SINGLE_APPROVER,
  })
  policy: ReviewPolicy;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => CategoryReviewAssignment, (cra) => cra.review)
  assignments: CategoryReviewAssignment[];

  @OneToMany(() => CategoryReviewComment, (crc) => crc.review)
  comments: CategoryReviewComment[];
}
