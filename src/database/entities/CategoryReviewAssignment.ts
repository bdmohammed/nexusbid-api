import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { CategoryReview } from "./CategoryReview";
import { User } from "./User";
import { CategoryReviewAssignmentStatus } from "../../types/enums";

@Entity("category_review_assignments")
@Unique(["reviewId", "reviewerId"])
@Index(["reviewerId"])
export class CategoryReviewAssignment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "review_id", type: "uuid" })
  reviewId: string;

  @ManyToOne(() => CategoryReview, (r) => r.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "review_id" })
  review: CategoryReview;

  @Column({ name: "reviewer_id", type: "uuid" })
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reviewer_id" })
  reviewer: User;

  @Column({
    type: "varchar",
    length: 50,
    default: CategoryReviewAssignmentStatus.PENDING,
  })
  status: CategoryReviewAssignmentStatus;

  @CreateDateColumn({ name: "assigned_at", type: "timestamptz" })
  assignedAt: Date;

  @Column({
    name: "reviewed_at",
    type: "timestamptz",
    nullable: true,
    default: null,
  })
  reviewedAt: Date | null;
}
