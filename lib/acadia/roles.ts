const ADMIN_ROLES = new Set([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
]);

const STAFF_ROLES = new Set(['lecturer', 'staff', 'teacher']);

function normalizeRole(roleSlug: string | null | undefined): string {
  return roleSlug?.toLowerCase() ?? '';
}

/** Administrator-level access (includes legacy `registrar` slug for existing users). */
export function isAdmin(roleSlug: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeRole(roleSlug));
}

/** @deprecated Use {@link isAdmin} */
export const isAdminOrRegistrar = isAdmin;

export function isStaffOrTeacher(roleSlug: string | null | undefined): boolean {
  return STAFF_ROLES.has(normalizeRole(roleSlug));
}

export function canManageInstitution(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug);
}

export function canWriteRegistry(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug);
}

export function canWriteOperations(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return ADMIN_ROLES.has(slug) || STAFF_ROLES.has(slug);
}

export function isStudent(roleSlug: string | null | undefined): boolean {
  return normalizeRole(roleSlug) === 'student';
}
