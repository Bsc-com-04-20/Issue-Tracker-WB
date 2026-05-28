const DAMAGE_LABELS: Record<string, string> = {
  minor: 'minor',
  moderate: 'moderate — water escaping',
  major: 'major',
  emergency: 'emergency — uncontained flow',
};

export function buildCategoryIssueDescription(
  category: string,
  subcategory: string,
  attrs: Record<string, string>,
  landmark: string,
): string {
  const sub = subcategory.replace(/_/g, ' ');
  const parts: string[] = [`${category.replace(/_/g, ' ')} report: ${sub}.`];

  if (attrs.damageLevel) {
    parts.push(`Damage level: ${DAMAGE_LABELS[attrs.damageLevel] ?? attrs.damageLevel}.`);
  }
  if (attrs.visibleDamage) {
    parts.push(`Visible: ${attrs.visibleDamage}.`);
  }
  if (attrs.accountNumber) {
    parts.push(`Account: ${attrs.accountNumber}.`);
  }
  if (attrs.transactionId) {
    parts.push(`Transaction: ${attrs.transactionId}.`);
  }
  if (attrs.paymentMethod) {
    parts.push(`Payment method: ${attrs.paymentMethod.replace(/_/g, ' ')}.`);
  }
  if (attrs.waterAppearance) {
    parts.push(`Appearance: ${attrs.waterAppearance.replace(/_/g, ' ')}.`);
  }
  if (attrs.errorMessage) {
    parts.push(`Error: ${attrs.errorMessage}.`);
  }
  if (attrs.suspectDescription || attrs.fraudObserved) {
    parts.push(`Details: ${attrs.suspectDescription ?? attrs.fraudObserved}.`);
  }
  if (attrs.billDetail) {
    parts.push(attrs.billDetail);
  }
  if (attrs.metDetail) {
    parts.push(attrs.metDetail);
  }
  if (attrs.evidenceFileName) {
    parts.push(`Attachment: ${attrs.evidenceFileName}.`);
  }
  if (landmark.trim()) {
    parts.push(`Landmark: ${landmark.trim()}.`);
  }
  return parts.join(' ');
}
