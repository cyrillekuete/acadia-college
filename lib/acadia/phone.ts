/** Normalize phone for lookup and stable system-email keys. */
export function normalizePhoneForLookup(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length > 9) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length > 9) {
    digits = digits.slice(1);
  }
  return digits;
}
