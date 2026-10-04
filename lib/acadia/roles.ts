const ADMIN_ROLES = new Set([
  'admin',
  'super-admin',
  'financial-director',
  'registrar',
]);

const STAFF_ROLES = new Set(['lecturer', 'staff', 'teacher']);
export type RoleInput = string | readonly string[] | null | undefined;

function normalizeRoles(roleSlug: RoleInput): string[] {
  return (Array.isArray(roleSlug) ? roleSlug : [roleSlug]).filter((r): r is string => typeof r === 'string').map((r) => r.toLowerCase());
}
function hasAny(roleSlug: RoleInput, roles: ReadonlySet<string>): boolean {
  return normalizeRoles(roleSlug).some((role) => roles.has(role));
}
function normalizeRole(roleSlug: RoleInput): string {
  return normalizeRoles(roleSlug)[0] ?? '';
}

/** Administrator-level access (includes legacy `registrar` slug for existing users). */
export function isAdmin(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, ADMIN_ROLES);
}

/** @deprecated Use {@link isAdmin} */
export const isAdminOrRegistrar = isAdmin;

export function isStaffOrTeacher(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, STAFF_ROLES);
}

export function isDisciplineMaster(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['discipline-master']));
}

export function isLibraryAttendant(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['library-attendant']));
}

export function isSecretary(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['secretary']));
}

export function canManageInstitution(roleSlug: RoleInput): boolean {
  return isAdmin(roleSlug);
}

/** User CRUD and role assignment (admin and registrar only — excludes bursar and financial-director). */
export function canManageUsers(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['admin', 'super-admin', 'registrar']));
}

/**
 * Academic write access matching SQL `acadia_is_admin_or_registrar()`.
 * Includes financial-director; excludes bursar.
 */
export function canWriteAcademicAdmin(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['admin', 'super-admin', 'financial-director', 'registrar']));
}

/** Institution profile page (read). Writes still use {@link canWriteAcademicAdmin}. */
export function canViewInstitutionProfile(
  roleSlug: RoleInput,
): boolean {
  return isAdmin(roleSlug);
}

/** Tenant system settings (locale, session, policies). */
export function canViewTenantSettings(
  roleSlug: RoleInput,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Tenant API keys list/detail — matches TenantApiKey write RLS. */
export function canManageTenantApiKeys(
  roleSlug: RoleInput,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Admin get-started hub under My Account. */
export function canViewAccountGetStarted(
  roleSlug: RoleInput,
): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** Guardian / parent roles — accepts both new-schema 'parent' and legacy 'guardian'. */
export function isGuardian(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['guardian', 'parent']));
}

export function isFinancialDirector(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['financial-director']));
}

/** Fee plans, payments, ledger, and budget (admin, bursar, financial-director, registrar). */
export function canWriteFinance(roleSlug: RoleInput): boolean {
  return isAdmin(roleSlug) || hasAny(roleSlug, new Set(['bursar']));
}

export function canWriteRegistry(roleSlug: RoleInput): boolean {
  return isAdmin(roleSlug);
}

/** Subject catalog, groupings, and scheme-of-work CRUD (matches SQL admin/registrar). */
export function canViewSubjectCatalog(
  roleSlug: RoleInput,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug);
}

/** Students registry and class rosters (admins + teaching staff). */
export function canViewStudentRegistry(
  roleSlug: RoleInput,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug) || isSecretary(roleSlug);
}

/** Promotion, rollover, and data retention — matches SQL `acadia_is_admin_or_registrar()` (excludes bursar). */
export function canManagePromotion(roleSlug: RoleInput): boolean {
  return canWriteAcademicAdmin(roleSlug);
}

/** School announcements and event broadcasts (staff and administrators; not bursar). */
export function canManageAnnouncements(roleSlug: RoleInput): boolean {
  return canWriteOperations(roleSlug);
}

/** Guardian alerts compose, groups, and history (same gate as announcements). */
export function canManageAlerts(roleSlug: RoleInput): boolean {
  return canManageAnnouncements(roleSlug);
}

/** School-wide “all guardians” targeting (admins, not class teachers). */
export function canBroadcastAllGuardians(roleSlug: RoleInput): boolean {
  return canManageAlerts(roleSlug) && isAdmin(roleSlug);
}

/**
 * Official school WhatsApp (1:1 parent notices). In-app messaging stays open to
 * every signed-in user; the school WhatsApp number does not.
 */
export function canSendWhatsAppMessages(roleSlug: RoleInput): boolean {
  return canWriteOperations(roleSlug);
}

/** All signed-in tenant users may participate in messaging. */
export function canComposeMessages(_roleSlug: RoleInput): boolean {
  return true;
}

/** Group conversations: staff and administrators (matches `canWriteOperations`). */
export function canManageMessageGroups(roleSlug: RoleInput): boolean {
  return canWriteOperations(roleSlug);
}

/** Learning materials, inventory, allocations, and room maintenance (staff + admin). */
export function canManageResources(roleSlug: RoleInput): boolean {
  return canWriteOperations(roleSlug);
}

/** Any tenant member may submit a resource request. */
export function canRequestResources(_roleSlug: RoleInput): boolean {
  return true;
}

export function canWriteOperations(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set([...ADMIN_ROLES, ...STAFF_ROLES]));
}

export function isStudent(roleSlug: RoleInput): boolean {
  return hasAny(roleSlug, new Set(['student']));
}

/** Sessions list / detail (staff write, guardians & students read scoped via RLS). */
export function canViewAttendance(roleSlug: RoleInput): boolean {
  return (
    canWriteOperations(roleSlug) ||
    isDisciplineMaster(roleSlug) ||
    isGuardian(roleSlug) ||
    isStudent(roleSlug)
  );
}

/** Attendance reports (admins + teaching staff). */
export function canViewAttendanceReports(
  roleSlug: RoleInput,
): boolean {
  return isAdmin(roleSlug) || isStaffOrTeacher(roleSlug) || isDisciplineMaster(roleSlug);
}

/** Attendance analytics (administrators only; matches admin menu). */
export function canViewAttendanceAnalytics(
  roleSlug: RoleInput,
): boolean {
  return isAdmin(roleSlug);
}
