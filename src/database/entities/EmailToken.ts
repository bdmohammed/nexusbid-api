import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { EmailTokenType } from "../../types/enums";
import { User } from "./User";

@Entity("email_tokens")
export class EmailToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  /** bcrypt hash of the raw token — never store raw tokens */
  @Column()
  tokenHash: string;

  @Column({ type: "enum", enum: EmailTokenType })
  type: EmailTokenType;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  /** Set when token is consumed — single-use enforcement */
  @Column({ type: "timestamptz", nullable: true, default: null })
  usedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;
}
