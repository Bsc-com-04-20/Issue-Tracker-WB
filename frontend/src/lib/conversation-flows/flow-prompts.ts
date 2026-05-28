import type { PremiseMeterLookupResponse } from '@/lib/types';

export function accountConfirmPrompt(lookup: PremiseMeterLookupResponse): string {
  const name = lookup.customerName?.trim() ?? 'Customer';
  const district = lookup.district?.trim() ?? '—';
  const area = lookup.area?.trim() ?? '—';
  const phone =
    lookup.registeredPhoneMasked?.trim() ??
    (lookup.phoneHintLast4
      ? `Registered number ends in ${lookup.phoneHintLast4.replace(/^…/, '')}`
      : 'On file at the water board');
  return (
    `Welcome, ${name}.\n\n` +
    `Account details:\n` +
    `• District: ${district}\n` +
    `• Area: ${area}\n` +
    `• Phone: ${phone}\n\n` +
    `Please confirm these details are correct.`
  );
}

export function landmarkPrompt(lookup: PremiseMeterLookupResponse | null): string {
  const district = lookup?.district?.trim() ?? 'your district';
  const area = lookup?.area?.trim() ?? 'your area';
  return (
    `Please confirm your exact location.\n\n` +
    `Current location:\n` +
    `• District: ${district}\n` +
    `• Area: ${area}\n\n` +
    `Type a nearby landmark (for example, near a market or main road junction).`
  );
}
