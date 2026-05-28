import { Role } from '../common/enums/role.enum';
import { ISSUE_CLASSIFICATION } from './issue-classification';
import {
  ISSUE_ATTRIBUTE_SCHEMAS,
  type AttributeFieldDefinition,
} from './issue-attributes.schema';
import { departmentPlaybooksRecord } from './issue-department-playbook';
import { intakeRoutingHintsRecord } from './issue-intake-routing-hints';
import { FRAUD_INVESTIGATION_CATEGORY } from './issue-fraud-access';
import type { DepartmentPlaybookDto } from './issue-department-playbook';
import type { IssueCategoryDefinition } from './issue-classification';

export type StaffClassificationPayload = {
  categories: Record<string, IssueCategoryDefinition>;
  attributeSchemas: Record<string, AttributeFieldDefinition[]>;
  departmentPlaybooks: Record<string, DepartmentPlaybookDto>;
  intakeRoutingHints: Record<string, string>;
};

function fullClassificationPayload(): StaffClassificationPayload {
  return {
    categories: { ...ISSUE_CLASSIFICATION },
    attributeSchemas: { ...ISSUE_ATTRIBUTE_SCHEMAS },
    departmentPlaybooks: departmentPlaybooksRecord(),
    intakeRoutingHints: intakeRoutingHintsRecord(),
  };
}

/** Intake must not receive fraud / inspection-only category metadata in APIs. */
export function buildStaffClassificationPayload(role: Role): StaffClassificationPayload {
  if (role !== Role.INTAKE_OFFICER) {
    return fullClassificationPayload();
  }

  const categories = { ...ISSUE_CLASSIFICATION };
  delete categories[FRAUD_INVESTIGATION_CATEGORY];

  const fraudSubs =
    ISSUE_CLASSIFICATION[FRAUD_INVESTIGATION_CATEGORY]?.subcategories ?? [];

  const attributeSchemas: Record<string, AttributeFieldDefinition[]> = {
    ...ISSUE_ATTRIBUTE_SCHEMAS,
  };
  for (const sub of fraudSubs) {
    delete attributeSchemas[sub];
  }

  const departmentPlaybooks = { ...departmentPlaybooksRecord() };
  delete departmentPlaybooks[FRAUD_INVESTIGATION_CATEGORY];

  const intakeRoutingHints = { ...intakeRoutingHintsRecord() };
  const fraudPrefix = `${FRAUD_INVESTIGATION_CATEGORY}:`;
  for (const key of Object.keys(intakeRoutingHints)) {
    if (key.startsWith(fraudPrefix)) {
      delete intakeRoutingHints[key];
    }
  }

  return {
    categories,
    attributeSchemas,
    departmentPlaybooks,
    intakeRoutingHints,
  };
}
