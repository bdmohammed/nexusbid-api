import { DataSource } from "typeorm";

export interface SeedInterface {
  name: string;
  up(dataSource: DataSource): Promise<void>;
  down(dataSource: DataSource): Promise<void>;
}
