import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity("seed_histories")
export class SeedHistory {
  @PrimaryColumn({ type: "varchar", length: 150 })
  id: string;

  @CreateDateColumn({ name: "executed_at", type: "timestamptz" })
  executedAt: Date;

  @Column({ type: "varchar", length: 64 })
  checksum: string;

  @Column({ type: "varchar", length: 50 })
  status: string;
}
