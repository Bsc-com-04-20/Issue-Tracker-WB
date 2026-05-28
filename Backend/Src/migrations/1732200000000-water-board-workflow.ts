import { MigrationInterface, QueryRunner } from 'typeorm';

export class WaterBoardWorkflow1732200000000 implements MigrationInterface {
  name = 'WaterBoardWorkflow1732200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      )) as { c: number }[];
      return Number(rows[0]?.c) > 0;
    };

    if (!(await hasColumn('issues', 'issueCategory'))) {
      await queryRunner.query(
        "ALTER TABLE `issues` ADD `issueCategory` varchar(50) NOT NULL DEFAULT 'water_supply'",
      );
    }
    if (!(await hasColumn('issues', 'assignedDepartment'))) {
      await queryRunner.query(
        "ALTER TABLE `issues` ADD `assignedDepartment` varchar(50) NOT NULL DEFAULT 'operations_department'",
      );
    }
    if (!(await hasColumn('issues', 'issueSubcategory'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `issueSubcategory` varchar(80) NULL',
      );
    }
    if (!(await hasColumn('issues', 'urgencyLevel'))) {
      await queryRunner.query(
        "ALTER TABLE `issues` ADD `urgencyLevel` varchar(20) NOT NULL DEFAULT 'normal'",
      );
    }
    if (!(await hasColumn('issues', 'accountNumber'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `accountNumber` varchar(40) NULL',
      );
    }
    if (!(await hasColumn('issues', 'affectedScope'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `affectedScope` varchar(50) NULL',
      );
    }
    if (!(await hasColumn('issues', 'issueAttributes'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `issueAttributes` json NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `issueAttributes`');
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `affectedScope`');
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `accountNumber`');
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `urgencyLevel`');
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `issueSubcategory`');
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `assignedDepartment`',
    );
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `issueCategory`');
  }
}
