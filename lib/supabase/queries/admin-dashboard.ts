import type { SupabaseClient } from '@supabase/supabase-js';
import { unwrapRelation } from '@/lib/acadia/record-display';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export type AdminDashboardStats = {
  students: number;
  studentsGrowthPercent: number | null;
  teachers: number;
  teachersNewThisMonth: number;
  activeClasses: number;
  activeSubjects: number;
  revenueMinor: number;
  revenueGrowthPercent: number | null;
};

export type AdminActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  category: 'auth' | 'academic' | 'report' | 'general';
};

export type SystemLogActivityRow = {
  id: string;
  event: string | null;
  description: string | null;
  createdAt: string;
  User?: unknown;
};

function monthRange(monthOffset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function countStudentProfiles(
  supabase: Client,
  tenantId: string,
  createdBefore?: string,
) {
  let query = supabase
    .from('StudentProfile')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId);
  if (createdBefore) {
    query = query.lt('createdAt', createdBefore);
  }
  const { count, error } = await query;
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function countStaffProfiles(
  supabase: Client,
  tenantId: string,
  createdSince?: string,
) {
  let query = supabase
    .from('StaffProfile')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId);
  if (createdSince) {
    query = query.gte('createdAt', createdSince);
  }
  const { count, error } = await query;
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function countActiveClasses(supabase: Client, tenantId: string) {
  const { count, error } = await supabase
    .from('Class')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .eq('status', 'ACTIVE');
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function countActiveSubjects(supabase: Client, tenantId: string) {
  const { count, error } = await supabase
    .from('Subject')
    .select('*', { count: 'exact', head: true })
    .eq('tenantId', tenantId)
    .is('deactivatedAt', null);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

async function sumLedgerIncome(
  supabase: Client,
  tenantId: string,
  from?: string,
  to?: string,
) {
  let query = supabase
    .from('FinanceLedgerEntry')
    .select('amountMinor')
    .eq('tenantId', tenantId)
    .eq('entryType', 'INCOME');
  if (from) {
    query = query.gte('occurredOn', from.slice(0, 10));
  }
  if (to) {
    query = query.lte('occurredOn', to.slice(0, 10));
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []).reduce((sum, row) => sum + Number(row.amountMinor ?? 0), 0);
}

export async function fetchAdminDashboardStats(
  supabase: Client,
  tenantId: string,
  _academicYearId?: string,
): Promise<AdminDashboardStats> {
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const [
    students,
    teachers,
    teachersNewThisMonth,
    activeClasses,
    activeSubjects,
    revenueMinor,
    revenueLastMonthMinor,
    studentsAtStartOfMonth,
  ] = await Promise.all([
    countStudentProfiles(supabase, tenantId),
    countStaffProfiles(supabase, tenantId),
    countStaffProfiles(supabase, tenantId, thisMonth.start),
    countActiveClasses(supabase, tenantId),
    countActiveSubjects(supabase, tenantId),
    sumLedgerIncome(supabase, tenantId),
    sumLedgerIncome(supabase, tenantId, lastMonth.start, lastMonth.end),
    countStudentProfiles(supabase, tenantId, thisMonth.start),
  ]);

  const revenueThisMonthMinor = await sumLedgerIncome(
    supabase,
    tenantId,
    thisMonth.start,
    thisMonth.end,
  );

  return {
    students,
    studentsGrowthPercent: percentChange(students, studentsAtStartOfMonth),
    teachers,
    teachersNewThisMonth,
    activeClasses,
    activeSubjects,
    revenueMinor,
    revenueGrowthPercent: percentChange(revenueThisMonthMinor, revenueLastMonthMinor),
  };
}

export function categorizeActivity(action: string): AdminActivityItem['category'] {
  const lower = action.toLowerCase();
  if (
    lower.includes('login') ||
    lower.includes('sign') ||
    lower.startsWith('user.') ||
    lower.startsWith('account.')
  ) {
    return 'auth';
  }
  if (
    lower.includes('exam') ||
    lower.includes('class') ||
    lower.includes('subject') ||
    lower.includes('enrollment') ||
    lower.includes('student') ||
    lower.includes('attendance') ||
    lower.includes('promotion') ||
    lower.includes('academic')
  ) {
    return 'academic';
  }
  if (lower.includes('report') || lower.includes('transcript')) {
    return 'report';
  }
  return 'general';
}

export function titleFromSystemLogEvent(event: string | null | undefined): string {
  const raw = event?.trim();
  if (!raw) {
    return 'Activity';
  }
  const spaced = raw.replace(/[._]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function activityFromSystemLog(row: SystemLogActivityRow): AdminActivityItem {
  const event = row.event?.trim() || 'activity';
  const title = titleFromSystemLogEvent(event);
  const description =
    row.description?.trim() || `${title} recorded successfully`;
  const user = unwrapRelation<{ name?: string | null }>(row.User);
  const namedDescription = user?.name?.trim()
    ? `${user.name.trim()} · ${description}`
    : description;

  return {
    id: row.id,
    title,
    description: namedDescription,
    createdAt: row.createdAt,
    category: categorizeActivity(event),
  };
}

export async function fetchAdminRecentActivities(
  supabase: Client,
  tenantId: string,
  limit = 8,
): Promise<AdminActivityItem[]> {
  const { data, error } = await supabase
    .from('SystemLog')
    .select('id, event, description, createdAt, User:userId ( name, tenantId )')
    .eq('User.tenantId', tenantId)
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => activityFromSystemLog(row as SystemLogActivityRow));
}
