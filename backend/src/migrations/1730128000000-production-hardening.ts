import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionHardening1730128000000 implements MigrationInterface {
  name = 'ProductionHardening1730128000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = (await queryRunner.query(
        `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      )) as { c: number }[];
      return Number(rows[0]?.c) > 0;
    };

    if (!(await hasColumn('users', 'failed_login_attempts'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `failed_login_attempts` int NOT NULL DEFAULT 0',
      );
    }
    if (!(await hasColumn('users', 'lockout_until'))) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `lockout_until` datetime NULL',
      );
    }
    if (!(await hasColumn('issues', 'reporter_email'))) {
      await queryRunner.query(
        'ALTER TABLE `issues` ADD `reporter_email` varchar(190) NULL',
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`refresh_tokens\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tokenHash\` varchar(64) NOT NULL,
        \`expiresAt\` datetime NOT NULL,
        \`revokedAt\` datetime NULL,
        \`userId\` int NULL,
        PRIMARY KEY (\`id\`),
        KEY \`FK_refresh_user\` (\`userId\`),
        CONSTRAINT \`FK_refresh_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`issue_attachments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`storedPath\` varchar(500) NOT NULL,
        \`originalName\` varchar(255) NOT NULL,
        \`mimeType\` varchar(120) NOT NULL,
        \`sizeBytes\` int NOT NULL,
        \`uploadedAt\` datetime NOT NULL,
        \`issueId\` int NULL,
        \`uploadedById\` int NULL,
        PRIMARY KEY (\`id\`),
        KEY \`FK_att_issue\` (\`issueId\`),
        KEY \`FK_att_user\` (\`uploadedById\`),
        CONSTRAINT \`FK_att_issue\` FOREIGN KEY (\`issueId\`) REFERENCES \`issues\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_att_user\` FOREIGN KEY (\`uploadedById\`) REFERENCES \`users\`(\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `issue_attachments`');
    await queryRunner.query('DROP TABLE IF EXISTS `refresh_tokens`');
    await queryRunner.query(
      'ALTER TABLE `issues` DROP COLUMN `reporter_email`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` DROP COLUMN `lockout_until`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` DROP COLUMN `failed_login_attempts`',
    );
  }
}
