const ADMIN_ROLES = new Set([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
  'bursar',
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

/** User CRUD and role assignment (admin and registrar only — excludes bursar and financial-director). */
export function canManageUsers(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return slug === 'admin' || slug === 'super-admin' || slug === 'registrar';
}

/**
 * Academic write access matching SQL `acadia_is_admin_or_registrar()`.
 * Includes financial-director; excludes bursar.
 */
export function canWriteAcademicAdmin(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return (
    slug === 'admin' ||
    slug === 'super-admin' ||
    slug === 'financial-director' ||
    slug === 'registrar'
  );
}

/** Guardian / parent roles — accepts both new-schema 'parent' and legacy 'guardian'. */
export function isGuardian(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return slug === 'guardian' || slug === 'parent';
}

export function isFinancialDirector(roleSlug: string | null | undefined): boolean {
  return normalizeRole(roleSlug) === 'financial-director';
}

/** Fee plans, payments, ledger, and budget (admin + bursar). */
export function canWriteFinance(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug);
}

export function canWriteRegistry(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug);
}

/** Promotion, rollover, and data retention (administrators). */
export function canManagePromotion(roleSlug: string | null | undefined): boolean {
  return canWriteRegistry(roleSlug);
}

/** School announcements and event broadcasts (staff and administrators). */
export function canManageAnnouncements(roleSlug: string | null | undefined): boolean {
  return canWriteOperations(roleSlug);
}

/** Guardian alerts compose, groups, and history (staff and administrators). */
export function canManageAlerts(roleSlug: string | null | undefined): boolean {
  return canWriteOperations(roleSlug);
}

/**
 * Official school WhatsApp (1:1 parent notices). In-app messaging stays open to
 * every signed-in user; the school WhatsApp number does not.
 */
export function canSendWhatsAppMessages(roleSlug: string | null | undefined): boolean {
  return canWriteOperations(roleSlug);
}

/** All signed-in tenant users may participate in messaging. */
export function canComposeMessages(_roleSlug: string | null | undefined): boolean {
  return true;
}

/** Learning materials, inventory, allocations, and room maintenance (staff + admin). */
export function canManageResources(roleSlug: string | null | undefined): boolean {
  return canWriteOperations(roleSlug);
}

/** Any tenant member may submit a resource request. */
export function canRequestResources(_roleSlug: string | null | undefined): boolean {
  return true;
}

export function canWriteOperations(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return ADMIN_ROLES.has(slug) || STAFF_ROLES.has(slug);
}

export function isStudent(roleSlug: string | null | undefined): boolean {
  return normalizeRole(roleSlug) === 'student';
}
