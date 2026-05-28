import type { PremiseMeterLookupResponse } from '@/lib/types';

/** Maps guided-flow keys into backend issueAttributes schema fields. */
export function mapPublicIssueAttributes(
  category: string,
  subcategory: string,
  attrs: Record<string, string>,
  meterLookup: PremiseMeterLookupResponse | null,
): Record<string, string> {
  const out: Record<string, string> = { ...attrs };

  if (category === 'infrastructure_maintenance') {
    if (attrs.infDamageLevel) {
      out.damageLevel = attrs.infDamageLevel;
    }
    if (attrs.infVisible) {
      out.visibleDamage = attrs.infVisible;
    }
    if (attrs.infSafety === 'yes') {
      out.damageLevel = out.damageLevel || 'emergency';
    }
    if (meterLookup?.area) {
      out.nearbyLandmark = attrs.wsLandmark ?? meterLookup.area;
    }
  }

  if (category === 'billing_account') {
    out.accountNumber =
      attrs.billAccountConfirm?.trim() ||
      meterLookup?.accountNumber?.trim() ||
      attrs.accountNumber ||
      '';
    if (attrs.billPaymentMethod && attrs.billPaymentMethod !== 'na') {
      out.paymentMethod = attrs.billPaymentMethod;
    }
    if (attrs.billTransactionId) {
      out.transactionId = attrs.billTransactionId;
    }
  }

  if (category === 'metering') {
    out.meterNumber = meterLookup?.meterNumber?.trim() || attrs.meterNumber || '';
    if (attrs.metErrorCode) {
      out.errorCode = attrs.metErrorCode;
    }
    if (attrs.metTokenId) {
      out.tokenId = attrs.metTokenId;
    }
  }

  if (category === 'water_quality') {
    if (attrs.wqAppearance) {
      out.waterAppearance = attrs.wqAppearance.replace(/_/g, ' ');
    }
    if (meterLookup?.area) {
      out.affectedArea = meterLookup.area;
    }
  }

  if (category === 'digital_payment') {
    if (attrs.digErrorMessage) {
      out.errorMessage = attrs.digErrorMessage;
    }
    if (attrs.digTransactionId) {
      out.transactionId = attrs.digTransactionId;
    }
    if (attrs.digPlatform) {
      out.paymentPlatform = attrs.digPlatform;
    }
    if (meterLookup?.registeredPhoneMasked) {
      out.mobileNumber = meterLookup.registeredPhoneMasked;
    }
  }

  if (category === 'illegal_connection_fraud') {
    if (attrs.fraudObserved) {
      out.suspectDescription = attrs.fraudObserved;
    }
  }

  if (subcategory && !out.affectedArea && meterLookup?.area) {
    out.affectedArea = meterLookup.area;
  }

  return out;
}
