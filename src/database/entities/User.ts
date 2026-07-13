import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { AccountType, UserStatus } from "../../types/enums";
import { Subscription } from "./Subscription";
import { Transaction } from "./Transaction";
import { UserRole } from "./UserRole";
import { Role } from "./Role";

@Entity("users")
@Index(["email"])
@Index(["accountType"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 160 })
  email: string;

  @Column({ type: "varchar" })
  passwordHash: string;

  @Column({ type: "enum", enum: AccountType, default: AccountType.USER })
  accountType: AccountType;

  @Column({ type: "varchar", nullable: true, length: 160, default: null })
  companyName: string | null;

  @Column({ type: "varchar", nullable: true, length: 100, default: null })
  country: string | null;

  @Column({ type: "boolean", default: false })
  emailVerified: boolean;

  @Column({ type: "boolean", default: false })
  isBlocked: boolean;

  @Column({
    type: "varchar",
    length: 50,
    default: UserStatus.PENDING_EMAIL_VERIFICATION,
  })
  status: UserStatus;

  @Column({ type: "uuid", nullable: true, default: null })
  approvedById: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  approvedAt: Date | null;

  @Column({ type: "text", nullable: true, default: null })
  rejectionReason: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "approved_by_id" })
  approvedBy: User | null;

  /**
   * Incremented on password change, email change, or account block.
   * JWT payload carries tokenVersion — mismatch = revoked session.
   */
  @Column({ type: "int", default: 1 })
  tokenVersion: number;

  @Column({ type: "int", default: 0 })
  failedLoginAttempts: number;

  @Column({ type: "timestamptz", nullable: true, default: null })
  lockoutUntil: Date | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  passwordChangedAt: Date | null;

  @Column({ type: "boolean", default: false })
  mustResetPassword: boolean;

  @Column({ type: "varchar", nullable: true, length: 160, default: null })
  pendingEmail: string | null;

  @Column({ type: "varchar", nullable: true, length: 255, default: null })
  avatarUrl: string | null;

  @Column({
    type: "jsonb",
    default: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      security: true,
      tender: true,
      newsletter: false,
    },
  })
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    security: boolean;
    tender: boolean;
    newsletter: boolean;
  };

  @Column({ type: "timestamptz", nullable: true, default: null })
  lastLoginAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  emailChangedAt: Date | null;

  @Column({ type: "varchar", nullable: true, default: null })
  googleId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  githubId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  microsoftId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  // ─── Relations (no eager: true anywhere) ─────────────────────────────────
  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];

  @OneToMany(() => Transaction, (t) => t.user)
  transactions: Transaction[];

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];

  @OneToMany(() => Role, (role) => role.createdBy)
  rolesCreated: Role[];

  @OneToMany(() => Role, (role) => role.updatedBy)
  rolesUpdated: Role[];

  @OneToMany(() => UserRole, (ur) => ur.assignedBy)
  assignedRoles: UserRole[];
}
