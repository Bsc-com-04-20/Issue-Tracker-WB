/** Result of resolving a meter / premise key to operational context (CRM/CIS integration point). */
export type PremiseLookupResult = {
  found: boolean;
  meterNumber: string;
  customerId?: string;
  customerName?: string;
  /** E.164-style; never returned on public lookup — use OTP flow. */
  phoneNumber?: string;
  nationalId?: string;
  accountNumber?: string;
  physicalAddress?: string;
  district?: string;
  area?: string;
  meterSerial?: string;
  /** Suggested map pin when the registry has coordinates (optional). */
  latitude?: number;
  longitude?: number;
  serviceArea?: string;
  supplyZone?: string;
  meterType?: string;
  accountType?: string;
  accountStatus?: string;
  /** Current outstanding balance in MWK from billing/CIS (read-only for staff). */
  accountBalanceMwk?: number;
  /** Payment amount pending allocation (e.g. mobile-money txn not yet on ledger). */
  pendingPaymentMwk?: number;
  connectionStatus?: string;
  installationDate?: string;
  waterTariffCategory?: string;
  /** Count of other non-closed issues linked to this premise in the tracker (demo: static). */
  openIssuesOnPremise?: number;
};

/** Public-safe meter preview (no raw phone / national ID). */
export type PremiseLookupPublicResult = Omit<
  PremiseLookupResult,
  'phoneNumber' | 'nationalId'
> & {
  requiresOwnershipVerification?: boolean;
  /** Last 4 digits hint for the customer, e.g. …4567 */
  phoneHintLast4?: string;
  /** Masked registered mobile for account confirmation (e.g. +265991***0001). */
  registeredPhoneMasked?: string;
};
