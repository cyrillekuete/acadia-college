const ADMIN_ROLES = new Set([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
]);

const STAFF_ROLES = new Set(['lecturer', 'staff', 'teacher', 'discipline-master', 'library-attendant', 'secretary']);

// 'parent' is the new-schema value; 'guardian' is the legacy slug kept
// for backward compat during the migration window.
const GUARDIAN_ROLES = new Set(['guardian', 'parent']);

const KNOWN_ROLE_SLUGS = new Set<string>([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
  'bursar',
  'discipline-master',
  'library-attendant',
  'secretary',
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
  roleSlug: string | readonly string[] | null | undefined,
): string | null {
  if (!roleSlug) {
    return null;
  }

  const slugs = (Array.isArray(roleSlug) ? roleSlug : [roleSlug]).filter((slug): slug is string => Boolean(slug)).map((slug) => slug.toLowerCase());
  const has = (...values: string[]) => slugs.some((slug) => values.includes(slug));

  if (has(...ADMIN_ROLES)) {
    return '/dashboard/admin';
  }
  if (has('teacher', 'lecturer', 'staff', 'discipline-master', 'library-attendant', 'secretary')) {
    return '/dashboard/staff';
  }
  if (has('bursar')) {
    return '/finance/fees';
  }
  if (has('student')) {
    return '/dashboard/student';
  }
  if (has(...GUARDIAN_ROLES)) {
    return '/dashboard/guardian';
  }

  return null;
}
