/** Normalize Malawi-style numbers for registry matching (digits only, country code 265). */
export function normalizePhoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) {
    d = d.slice(2);
  }
  if (d.startsWith('0') && d.length >= 9) {
    d = `265${d.slice(1)}`;
  }
  if (d.length === 9 && !d.startsWith('265')) {
    d = `265${d}`;
  }
  return d;
}
