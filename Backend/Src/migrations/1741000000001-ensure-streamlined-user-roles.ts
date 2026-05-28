import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent role cleanup before enum shrink. Fixes startup when DB_SYNC runs
 * against rows that still use legacy role values (e.g. officer, billing_department_officer).
 */
export class EnsureStreamlinedUserRoles1741000000001 implements MigrationInterface {
  name = 'EnsureStreamlinedUserRoles1741000000001';

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
        'metering_unit_officer',
        'maintenance_department_officer',
        'ict_digital_services_officer',
        'operations_department_officer',
        'inspection_compliance_officer',
        'community_leader',
        'customer_citizen',
        'requester',
        'intake_officer',
        'department_officer',
        'citizen'
      ) NOT NULL
    `);

    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'admin' WHERE \`role\` = 'ict_system_administrator'
    `);
    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'supervisor' WHERE \`role\` = 'regional_operations_manager'
    `);
    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'intake_officer'
      WHERE \`role\` IN ('officer', 'customer_service_officer', 'call_center_agent', 'registry_records_officer')
    `);
    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'citizen'
      WHERE \`role\` IN ('requester', 'customer_citizen', 'community_leader')
    `);

    await queryRunner.query(`
      UPDATE \`users\` SET \`department\` = COALESCE(
        NULLIF(TRIM(\`department\`), ''),
        CASE \`role\`
          WHEN 'billing_department_officer' THEN 'billing_department'
          WHEN 'water_quality_officer' THEN 'water_quality_unit'
          WHEN 'metering_unit_officer' THEN 'metering_unit'
          WHEN 'maintenance_department_officer' THEN 'maintenance_department'
          WHEN 'ict_digital_services_officer' THEN 'ict_digital_services_department'
          WHEN 'operations_department_officer' THEN 'operations_department'
          WHEN 'inspection_compliance_officer' THEN 'inspection_compliance_unit'
          ELSE NULL
        END
      )
      WHERE \`role\` IN (
        'billing_department_officer',
        'water_quality_officer',
        'metering_unit_officer',
        'maintenance_department_officer',
        'ict_digital_services_officer',
        'operations_department_officer',
        'inspection_compliance_officer'
      )
    `);

    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'department_officer'
      WHERE \`role\` IN (
        'billing_department_officer',
        'water_quality_officer',
        'metering_unit_officer',
        'maintenance_department_officer',
        'ict_digital_services_officer',
        'operations_department_officer',
        'inspection_compliance_officer'
      )
    `);

    await queryRunner.query(`
      UPDATE \`users\` SET \`role\` = 'intake_officer'
      WHERE \`role\` NOT IN (
        'admin',
        'supervisor',
        'technician',
        'intake_officer',
        'department_officer',
        'citizen'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`role\` ENUM(
        'admin',
        'supervisor',
        'technician',
        'intake_officer',
        'department_officer',
        'citizen'
      ) NOT NULL
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'EnsureStreamlinedUserRoles1741000000001 cannot be reverted safely — restore database from backup if needed.',
    );
  }
}
