import type { User } from '../entities/User';
import type { DataSource } from 'typeorm';

export interface SeedInterface {
  name: string;
  up(dataSource: DataSource, systemUser?: User): Promise<void>;
  down(dataSource: DataSource): Promise<void>;
}
