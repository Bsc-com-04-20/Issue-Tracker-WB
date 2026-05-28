import { MigrationInterface, QueryRunner } from 'typeorm';

export class OperationalIntelligenceFields1742000000000
  implements MigrationInterface
{
  name = 'OperationalIntelligenceFields1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (
      table: string,
      column: string,
    ): Promise<boolean> => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      )) as { c: number }[];
      return Number(rows[0]?.c) > 0;
    };

    if (!(await hasColumn('issues', 'premiseSnapshot'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `premiseSnapshot` json NULL',
      );
    }
    if (!(await hasColumn('issues', 'customerResolutionFeedback'))) {
      await queryRunner.query(
        "ALTER TABLE `issues` ADD `customerResolutionFeedback` varchar(20) NULL COMMENT 'pending|confirmed|disputed'",
      );
    }
    if (!(await hasColumn('issues', 'customerResolutionComment'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `customerResolutionComment` text NULL',
      );
    }
    if (!(await hasColumn('issues', 'customerResolutionAt'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `customerResolutionAt` datetime NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `customerResolutionAt`',
    );
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `customerResolutionComment`',
    );
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `customerResolutionFeedback`',
    );
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `premiseSnapshot`',
    );
  }
}
