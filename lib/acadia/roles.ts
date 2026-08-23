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

/** Institution profile page (read). Writes still use {@link canWriteAcademicAdmin}. */
export function canViewInstitutionProfile(
  roleSlug: string | null | undefined,
): boolean {
  return isAdmin(roleSlug);
}

/** Tenant system settings (locale, session, policies). */
export function canViewTenantSettings(
  roleSlug: string | null | undefined,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Tenant API keys list/detail — matches TenantApiKey write RLS. */
export function canManageTenantApiKeys(
  roleSlug: string | null | undefined,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Admin get-started hub under My Account. */
export function canViewAccountGetStarted(
  roleSlug: string | null | undefined,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Guardian / parent roles — accepts both new-schema 'parent' and legacy 'guardian'. */
export function isGuardian(roleSlug: string | null | undefined): boolean {
  const slug = normalizeRole(roleSlug);
  return slug === 'guardian' || slug === 'parent';
}

export function isFinancialDirector(roleSlug: string | null | undefined): boolean {
  return normalizeRole(roleSlug) === 'financial-director';
}

/** Fee plans, payments, ledger, and budget (admin, bursar, financial-director, registrar). */
export function canWriteFinance(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug);
}

export function canWriteRegistry(roleSlug: string | null | undefined): boolean {
  return isAdmin(roleSlug);
}

/** Subject catalog, groupings, and scheme-of-work CRUD (matches SQL admin/registrar). */
export function canViewSubjectCatalog(
  roleSlug: string | null | undefined,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug);
}

/** Students registry and class rosters (admins + teaching staff). */
export function canViewStudentRegistry(
  roleSlug: string | null | undefined,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug);
}

/** Promotion, rollover, and data retention — matches SQL `acadia_is_admin_or_registrar()` (excludes bursar). */
export function canManagePromotion(roleSlug: string | null | undefined): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** School announcements and event broadcasts (staff and administrators; not bursar). */
export function canManageAnnouncements(roleSlug: string | null | undefined): boolean {
  if (normalizeRole(roleSlug) === 'bursar') {
    return false;
  }
  return canWriteOperations(roleSlug);
}

/** Guardian alerts compose, groups, and history (same gate as announcements). */
export function canManageAlerts(roleSlug: string | null | undefined): boolean {
  return canManageAnnouncements(roleSlug);
}

/** School-wide “all guardians” targeting (admins, not class teachers). */
export function canBroadcastAllGuardians(roleSlug: string | null | undefined): boolean {
  return canManageAlerts(roleSlug) && isAdmin(roleSlug);
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

/** Group conversations: staff and administrators (matches `canWriteOperations`). */
export function canManageMessageGroups(roleSlug: string | null | undefined): boolean {
  return canWriteOperations(roleSlug);
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

/** Sessions list / detail (staff write, guardians & students read scoped via RLS). */
export function canViewAttendance(roleSlug: string | null | undefined): boolean {
  return (
    canWriteOperations(roleSlug) ||
    isGuardian(roleSlug) ||
    isStudent(roleSlug)
  );
}

/** Attendance reports (admins + teaching staff). */
export function canViewAttendanceReports(
  roleSlug: string | null | undefined,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug);
}

/** Attendance analytics (administrators only; matches admin menu). */
export function canViewAttendanceAnalytics(
  roleSlug: string | null | undefined,
): boolean {
  return isAdmin(roleSlug);
}
