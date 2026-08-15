import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  academicYearTag,
  catalogTag,
  classListTags,
  dashboardRoleTag,
  dashboardTag,
  dashboardYearTag,
  staffTag,
  studentsTag,
  studentsYearTag,
} from '@/lib/acadia/cache/tags';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { fetchAcademicYearOptions } from '@/lib/supabase/queries/academic-year-options';
import {
  fetchAcademicYearSetupStatus,
  fetchCurrentAcademicYear,
} from '@/lib/supabase/queries/academic-year';
import {
  fetchAdminDashboardStats,
  fetchAdminRecentActivities,
} from '@/lib/supabase/queries/admin-dashboard';
import { fetchClassList } from '@/lib/supabase/queries/class-list';
import { fetchLevelList } from '@/lib/supabase/queries/level-list';
import {
  fetchStaffProfileIdForUser,
  fetchStudentProfileIdForUser,
} from '@/lib/supabase/queries/profile-links';
import {
  fetchGuardianDashboardStats,
  fetchStaffDashboardStats,
  fetchStudentDashboardStats,
} from '@/lib/supabase/queries/role-dashboard';
import { fetchStaffList } from '@/lib/supabase/queries/staff-list';
import { fetchStudentsList } from '@/lib/supabase/queries/students-list';
import { fetchSubjectList } from '@/lib/supabase/queries/subject-list';
import { fetchAcadiaTenant } from '@/lib/supabase/queries/tenant';

function cachedClient(): SupabaseClient<Database> {
  return createAdminClient() as SupabaseClient<Database>;
}

export async function getCachedCurrentAcademicYear(tenantId: string) {
  'use cache';
  cacheTag(academicYearTag(tenantId), catalogTag(tenantId));
  cacheLife('hours');
  return fetchCurrentAcademicYear(cachedClient(), tenantId);
}

export async function getCachedAcademicYearSetup(tenantId: string) {
  'use cache';
  cacheTag(academicYearTag(tenantId), catalogTag(tenantId));
  cacheLife('hours');
  return fetchAcademicYearSetupStatus(cachedClient(), tenantId);
}

export async function getCachedAcademicYearOptions(tenantId: string) {
  'use cache';
  cacheTag(academicYearTag(tenantId), catalogTag(tenantId));
  cacheLife('hours');
  return fetchAcademicYearOptions(cachedClient(), tenantId);
}

export async function getCachedTenant(tenantId: string) {
  'use cache';
  cacheTag(catalogTag(tenantId));
  cacheLife('hours');
  return fetchAcadiaTenant(cachedClient(), tenantId);
}

export async function getCachedAdminDashboardStats(
  tenantId: string,
  yearId: string | null,
) {
  'use cache';
  cacheTag(dashboardTag(tenantId), dashboardYearTag(tenantId, yearId));
  cacheLife('minutes');
  return fetchAdminDashboardStats(cachedClient(), tenantId, yearId ?? undefined);
}

export async function getCachedAdminRecentActivities(tenantId: string) {
  'use cache';
  cacheTag(dashboardTag(tenantId));
  cacheLife('minutes');
  return fetchAdminRecentActivities(cachedClient(), tenantId);
}

export async function getCachedStaffDashboardStats(
  tenantId: string,
  yearId: string,
  userId: string,
) {
  'use cache';
  cacheTag(dashboardRoleTag(tenantId, userId), dashboardYearTag(tenantId, yearId));
  cacheLife('minutes');
  const supabase = cachedClient();
  const staffProfileId = await fetchStaffProfileIdForUser(
    supabase,
    tenantId,
    userId,
  );
  if (!staffProfileId) {
    return null;
  }
  return fetchStaffDashboardStats(supabase, tenantId, yearId, staffProfileId);
}

export async function getCachedStudentDashboardStats(
  tenantId: string,
  yearId: string,
  userId: string,
) {
  'use cache';
  cacheTag(dashboardRoleTag(tenantId, userId), dashboardYearTag(tenantId, yearId));
  cacheLife('minutes');
  const supabase = cachedClient();
  const studentProfileId = await fetchStudentProfileIdForUser(
    supabase,
    tenantId,
    userId,
  );
  if (!studentProfileId) {
    return null;
  }
  return fetchStudentDashboardStats(supabase, tenantId, yearId, studentProfileId);
}

export async function getCachedGuardianDashboardStats(
  tenantId: string,
  yearId: string,
  userId: string,
) {
  'use cache';
  cacheTag(dashboardRoleTag(tenantId, userId), dashboardYearTag(tenantId, yearId));
  cacheLife('minutes');
  return fetchGuardianDashboardStats(cachedClient(), tenantId, yearId, userId);
}

export async function getCachedStudentsList(tenantId: string, yearId: string) {
  'use cache';
  cacheTag(studentsTag(tenantId), studentsYearTag(tenantId, yearId));
  cacheLife('minutes');
  return fetchStudentsList(cachedClient(), tenantId, yearId);
}

export async function getCachedStaffList(
  tenantId: string,
  yearId: string | null,
) {
  'use cache';
  cacheTag(staffTag(tenantId));
  cacheLife('minutes');
  return fetchStaffList(cachedClient(), tenantId, yearId);
}

export async function getCachedClassList(
  tenantId: string,
  yearId: string | null,
) {
  'use cache';
  cacheTag(...classListTags(tenantId));
  cacheLife('hours');
  return fetchClassList(cachedClient(), tenantId, yearId);
}

export async function getCachedLevelList(tenantId: string) {
  'use cache';
  cacheTag(catalogTag(tenantId));
  cacheLife('hours');
  return fetchLevelList(cachedClient(), tenantId);
}

export async function getCachedSubjectList(tenantId: string) {
  'use cache';
  cacheTag(catalogTag(tenantId));
  cacheLife('hours');
  return fetchSubjectList(cachedClient(), tenantId);
}
