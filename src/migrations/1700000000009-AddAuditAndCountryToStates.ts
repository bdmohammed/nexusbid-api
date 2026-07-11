import { TableColumn, TableForeignKey } from 'typeorm';

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditAndCountryToStates1700000000009 implements MigrationInterface {
  name = 'AddAuditAndCountryToStates1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('states', [
      new TableColumn({
        name: 'created_at',
        type: 'timestamptz',
        default: 'now()',
      }),
      new TableColumn({
        name: 'updated_at',
        type: 'timestamptz',
        default: 'now()',
      }),
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
      new TableColumn({
        name: 'created_by',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'updated_by',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'country',
        type: 'varchar',
        length: '100',
        default: "'United States'",
      }),
    ]);

    await queryRunner.createForeignKeys('states', [
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['updated_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('states');
    if (table) {
      const createdByFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('created_by') !== -1,
      );
      const updatedByFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('updated_by') !== -1,
      );
      if (createdByFk) await queryRunner.dropForeignKey('states', createdByFk);
      if (updatedByFk) await queryRunner.dropForeignKey('states', updatedByFk);
    }

    await queryRunner.dropColumn('states', 'country');
    await queryRunner.dropColumn('states', 'updated_by');
    await queryRunner.dropColumn('states', 'created_by');
    await queryRunner.dropColumn('states', 'deleted_at');
    await queryRunner.dropColumn('states', 'updated_at');
    await queryRunner.dropColumn('states', 'created_at');
  }
}
