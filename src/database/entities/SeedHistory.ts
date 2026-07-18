import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

import { SeedStatus } from '@/types/enums';

@Entity('seed_histories')
export class SeedHistory {
  @PrimaryColumn({ type: 'varchar', length: 150 })
  id: string;

  @CreateDateColumn({ name: 'executed_at', type: 'timestamptz' })
  executedAt: Date;

  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Column({
    type: 'enum',
    enum: SeedStatus,
  })
  status: SeedStatus;
}
