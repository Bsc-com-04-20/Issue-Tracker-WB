import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentSpecialistRoles1740000000000
  implements MigrationInterface
{
  name = 'AddDepartmentSpecialistRoles1740000000000';

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
        'requester'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`users\`
      SET \`role\` = 'officer'
      WHERE \`role\` IN (
        'metering_unit_officer',
        'maintenance_department_officer',
        'ict_digital_services_officer',
        'operations_department_officer',
        'inspection_compliance_officer'
      )
    `);
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
}
