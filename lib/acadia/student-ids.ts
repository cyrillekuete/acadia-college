export function generateRegistrationNumber(academicYearLabel?: string): string {
  const yearPart =
    academicYearLabel?.replace(/\D/g, '').slice(-4) ||
    String(new Date().getFullYear());
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `AC-${yearPart}-${suffix}`;
}

/** Optional ministry matricule from manual input only (never auto-generated). */
export function normalizeMatriculeNumber(
  value: string | undefined | null,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
