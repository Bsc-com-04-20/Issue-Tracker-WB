/**
 * Short intake guidance: when to pick this category/subcategory vs another.
 * Keys: `${category}:${subcategory}` or `${category}:__default__`.
 */
const HINTS: Record<string, string> = {
  'metering:__default__':
    'Use Metering for faults at the customer meter, CIU/keypad, or loading tokens onto that meter.',
  'metering:prepaid_meter_token_failure':
    'One meter or household cannot load tokens while others work → stay here. If many customers cannot get tokens at the same time, use Digital & payment → token generation failure.',
  'metering:meter_interface_unit_failure':
    'Hardware/display/keypad on the customer interface → Metering. Central SMS or portal outages → Digital & payment.',
  'digital_payment:__default__':
    'Use Digital & payment for channel, portal, SMS, or central payment/token platform problems affecting integration or many customers.',
  'digital_payment:token_generation_failure':
    'Central token generation or vendor API outage (often wide impact). Single-meter load failures belong under Metering → prepaid meter token failure.',
  'digital_payment:sms_notification_failure':
    'Bulk SMS or OTP delivery failures from the platform. One-off handset issues are usually not this category.',
  'billing_account:__default__':
    'Billing / account: ledger, charges, payments, estimates, disputes, reconnection rules—not the pipe unless investigation proves leak-driven usage. Tier 1 captures facts and read type; analyst applies policy (cf. Baltimore bill review). Coordinate Metering or Maintenance before financial remedy if cause is physical.',
  'billing_account:estimated_billing_complaint':
    'Tier 1 CS: facts, bill period, meter read type (estimated vs actual). Billing analyst: read rules, adjustments, leak-credits policy (many cities publish review paths; see Baltimore bill review). Metering if a field read or test is required.',
  'billing_account:incorrect_meter_reading':
    'Billing owns the account outcome; Metering for field read verification or meter test when the register or read type is in question.',
  'billing_account:duplicate_charges':
    'Line-item and posting review stays with Billing; ICT only if duplicate stems from a channel double-post or sync defect.',
  'billing_account:payment_not_reflected':
    'Capture bank reference, date, amount, and channel. Billing reconciles the ledger; ICT if payment succeeded externally but never landed in the billing system.',
  'billing_account:delayed_reconnection':
    'Separate policy timing (Billing) from physical tap-on (often Metering). If payment is confirmed in the bank but not in the account, involve ICT for integration.',
  'billing_account:account_balance_dispute':
    'Include meter change dates, leak reports, or high-consumption periods. Physical leak confirmation or meter test may be required before leak credits—coordinate Maintenance or Metering.',
  'billing_account:wrong_customer_account_mapping':
    'Merged or wrong account links are Billing-led corrections; ensure occupancy and premise IDs are captured for audit.',
  'water_supply:no_water_supply':
    'Total loss of supply at taps: log here first. If neighbours are also dry, treat as possible zone outage — operations checks SCADA/valves and published outages. If only your home, operations still triages but metering may verify curb stop or meter. Visible burst in the street → also consider Infrastructure & maintenance.',
  'water_supply:low_water_pressure':
    'Weak flow at all taps can be network pressure or peak demand; weak at one tap may be internal plumbing. Operations reviews zone models; metering checks meter or stopcock when the area is otherwise normal.',
  'water_supply:intermittent_supply':
    'Supply cuts in and out: often valve operations, air, or zone balancing. Operations leads; water quality if colour or debris appears after episodes.',
  'water_supply:air_in_pipes':
    'Spluttering or milky water after work is often trapped air — run cold taps gently as per utility advice. If it persists with colour or odour, water quality may advise flushing or sampling.',
  'water_supply:delayed_water_restoration':
    'After promised restoration time from planned or emergency work: capture any outage reference or SMS. Operations coordinates re-supply; metering if the main is pressurised but the property is still dry.',
  'water_supply:__default__':
    'No supply, pressure, or intermittent service at the tap → Operations-led. Visible burst or leak on the street asset → Infrastructure & maintenance.',
  'infrastructure_maintenance:__default__':
    'Confirmed or visible network asset failure (burst, hydrant, valve, tank). Customer-only symptoms without confirmed asset → Water supply.',
  'infrastructure_maintenance:meter_infrastructure_damage':
    'Damage to meter chamber or connection on the board side → here. Pure meter register/CIU faults → Metering.',
  'water_quality:__default__':
    'Appearance, smell, taste, or health-related water concerns → Water quality. Zone outage without quality symptoms → Water supply.',
  'illegal_connection_fraud:__default__':
    'Theft, bypass, unauthorised connections, or tampering for fraud → Inspection & compliance; physical removal of illegal ties may involve Maintenance.',
};

export function intakeRoutingHintsRecord(): Record<string, string> {
  return { ...HINTS };
}

export function getIntakeRoutingHint(
  category: string,
  subcategory: string | null,
): string | undefined {
  const sub = subcategory?.trim() || '';
  if (sub) {
    const exact = HINTS[`${category}:${sub}`];
    if (exact) return exact;
  }
  return HINTS[`${category}:__default__`];
}
