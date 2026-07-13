import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  VersionColumn,
} from "typeorm";
import {
  TenderLifecycleStatus,
  TenderPublicationStatus,
} from "../../types/enums";
import { User } from "./User";
import { TenderVersion } from "./TenderVersion";
import { TenderCommittee } from "./TenderCommittee";
import { TenderParticipant } from "./TenderParticipant";
import { TenderWatcher } from "./TenderWatcher";
import { TenderInvitation } from "./TenderInvitation";
import { TenderQuestion } from "./TenderQuestion";
import { TenderClarification } from "./TenderClarification";
import { TenderAmendment } from "./TenderAmendment";

@Entity("tenders")
export class Tender {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "reference_no", unique: true })
  referenceNo: string;

  @Column({ name: "active_version_id", type: "uuid", nullable: true })
  activeVersionId: string | null;

  @ManyToOne(() => TenderVersion, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "active_version_id" })
  activeVersion: TenderVersion | null;

  @Column({
    type: "varchar",
    length: 50,
    default: TenderLifecycleStatus.ACTIVE,
  })
  status: TenderLifecycleStatus;

  @Column({
    name: "publication_status",
    type: "varchar",
    length: 50,
    default: TenderPublicationStatus.SCHEDULED,
  })
  publicationStatus: TenderPublicationStatus;

  @VersionColumn({ name: "db_version", default: 1 })
  dbVersion: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User | null;

  @Column({ name: "created_by_id", nullable: true, default: null })
  createdById: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => TenderVersion, (version) => version.tender)
  versions: TenderVersion[];

  @OneToMany(() => TenderCommittee, (committee) => committee.tender)
  committees: TenderCommittee[];

  @OneToMany(() => TenderParticipant, (participant) => participant.tender)
  participants: TenderParticipant[];

  @OneToMany(() => TenderWatcher, (watcher) => watcher.tender)
  watchers: TenderWatcher[];

  @OneToMany(() => TenderInvitation, (invitation) => invitation.tender)
  invitations: TenderInvitation[];

  @OneToMany(() => TenderQuestion, (question) => question.tender)
  questions: TenderQuestion[];

  @OneToMany(() => TenderClarification, (clarification) => clarification.tender)
  clarifications: TenderClarification[];

  @OneToMany(() => TenderAmendment, (amendment) => amendment.tender)
  amendments: TenderAmendment[];
}
