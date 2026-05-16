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

export function isAdminOrRegistrar(roleSlug: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeRole(roleSlug));
}

export function isStaffOrTeacher(roleSlug: string | null | undefined): boolean {
  return STAFF_ROLES.has(normalizeRole(roleSlug));
}

export function canManageInstitution(roleSlug: string | null | undefined): boolean {
  return isAdminOrRegistrar(roleSlug);
}

export function canWriteRegistry(roleSlug: string | null | undefined): boolean {
  return isAdminOrRegistrar(roleSlug);
}

export function canWriteOperations(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return ADMIN_ROLES.has(slug) || STAFF_ROLES.has(slug);
}

export function isStudent(roleSlug: string | null | undefined): boolean {
  return normalizeRole(roleSlug) === 'student';
}
