import type { PremiseLookupPublicResult, PremiseLookupResult } from './premise-lookup.types';

function maskRegisteredPhone(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) return undefined;
  const last4 = digits.slice(-4);
  const prefix = trimmed.startsWith('+') ? '+' : '';
  const visibleHead = digits.slice(0, Math.min(9, digits.length - 4));
  return `${prefix}${visibleHead}***${last4}`;
}

export function sanitizePremiseForPublic(row: PremiseLookupResult): PremiseLookupPublicResult {
  const { phoneNumber: _p, nationalId: _n, ...rest } = row;
  const digits = _p ? _p.replace(/\D/g, '') : '';
  const phoneHintLast4 =
    digits.length >= 4 ? `…${digits.slice(-4)}` : undefined;
  const registeredPhoneMasked = _p ? maskRegisteredPhone(_p) : undefined;
  return {
    ...rest,
    requiresOwnershipVerification: row.found === true,
    phoneHintLast4,
    registeredPhoneMasked,
  };
}
