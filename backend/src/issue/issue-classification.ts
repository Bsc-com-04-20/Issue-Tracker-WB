export type IssueCategoryDefinition = {
  label: string;
  department: string;
  subcategories: string[];
};

export const ISSUE_CLASSIFICATION: Record<string, IssueCategoryDefinition> = {
  water_supply: {
    label: 'Water Supply Issues',
    department: 'operations_department',
    subcategories: [
      'no_water_supply',
      'low_water_pressure',
      'intermittent_supply',
      'air_in_pipes',
      'delayed_water_restoration',
    ],
  },
  infrastructure_maintenance: {
    label: 'Infrastructure and Maintenance Issues',
    department: 'maintenance_department',
    subcategories: [
      'pipe_burst',
      'water_leakage',
      'damaged_valve',
      'broken_hydrant',
      'reservoir_or_tank_damage',
      'illegal_connection_damage',
      'meter_infrastructure_damage',
    ],
  },
  billing_account: {
    label: 'Billing and Account Issues',
    department: 'billing_department',
    subcategories: [
      'estimated_billing_complaint',
      'incorrect_meter_reading',
      'duplicate_charges',
      'payment_not_reflected',
      'delayed_reconnection',
      'account_balance_dispute',
      'wrong_customer_account_mapping',
    ],
  },
  metering: {
    label: 'Metering Issues',
    department: 'metering_unit',
    subcategories: [
      'faulty_meter',
      'meter_running_without_water',
      'prepaid_meter_token_failure',
      'meter_interface_unit_failure',
      'tampered_meter',
      'meter_leakage',
    ],
  },
  water_quality: {
    label: 'Water Quality Issues',
    department: 'water_quality_unit',
    subcategories: [
      'brown_or_dirty_water',
      'bad_smell',
      'bad_taste',
      'high_chlorine_levels',
      'suspected_contamination',
      'silt_or_mud_presence',
    ],
  },
  digital_payment: {
    label: 'Digital and Payment System Issues',
    department: 'ict_digital_services_department',
    subcategories: [
      'mobile_money_sync_failure',
      'failed_online_payment',
      'customer_portal_login_failure',
      'sms_notification_failure',
      'token_generation_failure',
      'system_downtime',
    ],
  },
  illegal_connection_fraud: {
    label: 'Illegal Connections and Fraud',
    department: 'inspection_compliance_unit',
    subcategories: [
      'illegal_water_connection',
      'meter_bypass',
      'water_theft',
      'tampering_with_infrastructure',
    ],
  },
};

export function formatIssueLabel(value: string): string {
  return value.replace(/_/g, ' ');
}
