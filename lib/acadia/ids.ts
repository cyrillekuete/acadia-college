/** Stable text primary keys for Acadia tables (matches existing seed style). */
export function generateAcadiaId(prefix: string): string {
  const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}-${slug}`;
}
