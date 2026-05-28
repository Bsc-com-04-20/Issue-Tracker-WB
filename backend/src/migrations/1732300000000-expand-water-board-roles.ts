import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandWaterBoardRoles1732300000000 implements MigrationInterface {
  name = 'ExpandWaterBoardRoles1732300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM(
        'admin',
        'ict_system_administrator',
        'supervisor',
        'regional_operations_manager',
        'technician',
        'officer',
        'customer_service_officer',
        'call_center_agent',
        'registry_records_officer',
        'billing_department_officer',
        'water_quality_officer',
        'community_leader',
        'customer_citizen',
        'requester'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`users\`
      SET \`role\` = 'officer'
      WHERE \`role\` IN (
        'customer_service_officer',
        'call_center_agent',
        'registry_records_officer',
        'billing_department_officer',
        'water_quality_officer'
      )
    `);
    await queryRunner.query(`
      UPDATE \`users\`
      SET \`role\` = 'supervisor'
      WHERE \`role\` = 'regional_operations_manager'
    `);
    await queryRunner.query(`
      UPDATE \`users\`
      SET \`role\` = 'admin'
      WHERE \`role\` = 'ict_system_administrator'
    `);
    await queryRunner.query(`
      UPDATE \`users\`
      SET \`role\` = 'requester'
      WHERE \`role\` IN ('community_leader', 'customer_citizen')
    `);
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM('admin', 'supervisor', 'technician', 'officer', 'requester') NOT NULL
    `);
  }
}
