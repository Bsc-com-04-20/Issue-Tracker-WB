import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendedOperationsSla1743000000000 implements MigrationInterface {
  name = 'ExtendedOperationsSla1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      )) as { c: number }[];
      return Number(rows[0]?.c) > 0;
    };

    if (!(await hasColumn('issues', 'slaFirstResponseDueAt'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `slaFirstResponseDueAt` datetime NULL',
      );
    }
    if (!(await hasColumn('issues', 'slaResolutionDueAt'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `slaResolutionDueAt` datetime NULL',
      );
    }
    if (!(await hasColumn('issues', 'slaBreachedAt'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `slaBreachedAt` datetime NULL',
      );
    }
    if (!(await hasColumn('issues', 'slaEscalationLevel'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `slaEscalationLevel` int NOT NULL DEFAULT 0',
      );
    }
    if (!(await hasColumn('users', 'homeBaseLatitude'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `homeBaseLatitude` double NULL',
      );
    }
    if (!(await hasColumn('users', 'homeBaseLongitude'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `homeBaseLongitude` double NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `homeBaseLongitude`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `homeBaseLatitude`');
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `slaEscalationLevel`',
    );
    await queryRunner.query('ALTER TABLE `issues` DROP COLUMN `slaBreachedAt`');
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `slaResolutionDueAt`',
    );
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `slaFirstResponseDueAt`',
    );
  }
}
