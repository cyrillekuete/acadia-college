/** Stable text primary keys for Acadia tables (matches existing seed style). */
export function generateAcadiaId(prefix: string): string {
  const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}-${slug}`;
}

/**
 * Sequential-looking student business key.
 * Format: STU-YYYY-NNNNN (e.g. STU-2026-00001)
 * The random suffix avoids collisions on concurrent inserts;
 * the server-side API should fall back to a DB sequence in production.
 */
export function generateStudentId(year?: number): string {
  const y = year ?? new Date().getFullYear();
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `STU-${y}-${n}`;
}

/**
 * Parent/guardian business key.
 * Format: PAR-YYYY-NNNNN (e.g. PAR-2026-00001)
 */
export function generateParentCode(year?: number): string {
  const y = year ?? new Date().getFullYear();
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `PAR-${y}-${n}`;
}
