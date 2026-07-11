import { TableColumn, TableForeignKey } from 'typeorm';

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToCategories1700000000008 implements MigrationInterface {
  name = 'AddSoftDeleteToCategories1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('categories', [
      new TableColumn({
        name: 'is_deleted',
        type: 'boolean',
        default: false,
      }),
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
    ]);

    await queryRunner.createForeignKeys('categories', [
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
    const table = await queryRunner.getTable('categories');
    if (table) {
      const createdByFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('created_by') !== -1,
      );
      const updatedByFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('updated_by') !== -1,
      );
      if (createdByFk) await queryRunner.dropForeignKey('categories', createdByFk);
      if (updatedByFk) await queryRunner.dropForeignKey('categories', updatedByFk);
    }

    await queryRunner.dropColumn('categories', 'updated_by');
    await queryRunner.dropColumn('categories', 'created_by');
    await queryRunner.dropColumn('categories', 'deleted_at');
    await queryRunner.dropColumn('categories', 'updated_at');
    await queryRunner.dropColumn('categories', 'created_at');
    await queryRunner.dropColumn('categories', 'is_deleted');
  }
}
