const ADMIN_ROLES = new Set([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
  'bursar',
]);

const STAFF_ROLES = new Set(['lecturer', 'staff', 'teacher']);

// 'parent' is the new-schema value; 'guardian' is the legacy slug kept
// for backward compat during the migration window.
const GUARDIAN_ROLES = new Set(['guardian', 'parent']);

const KNOWN_ROLE_SLUGS = new Set<string>([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
  'bursar',
  'lecturer',
  'staff',
  'teacher',
  'student',
  'guardian',
  'parent',
]);

/** Safe fallback when a role slug is missing or not mapped to a dashboard. */
export const ACADIA_DEFAULT_LANDING_PATH = '/account/home/get-started';

export function isKnownAcadiaRole(roleSlug: string | null | undefined): boolean {
  if (!roleSlug) {
    return false;
  }
  return KNOWN_ROLE_SLUGS.has(roleSlug.toLowerCase());
}

/**
 * Resolves the role dashboard path, or `null` when the slug is missing or unrecognized.
 * Callers must handle `null` — do not assume a default admin route.
 */
export function getDashboardPathForRole(
  roleSlug: string | null | undefined,
): string | null {
  if (!roleSlug) {
    return null;
  }

  const slug = roleSlug.toLowerCase();

  if (ADMIN_ROLES.has(slug)) {
    return '/dashboard/admin';
  }
  if (STAFF_ROLES.has(slug)) {
    return '/dashboard/staff';
  }
  if (slug === 'student') {
    return '/dashboard/student';
  }
  if (GUARDIAN_ROLES.has(slug)) {
    return '/dashboard/guardian';
  }

  return null;
}
