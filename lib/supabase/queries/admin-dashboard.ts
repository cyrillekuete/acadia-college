import { SupabaseClient } from '@supabase/supabase-js';

export type AdminDashboardStats = {
  students: number;
  studentsGrowthPercent: number | null;
  teachers: number;
  teachersNewThisMonth: number;
  activeClasses: number;
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

async function countRows(
  supabase: SupabaseClient,
  table: string,
  options?: {
    tenantColumn?: string;
    tenantId?: string;
    filters?: { column: string; op: 'eq' | 'gte' | 'lte' | 'lt'; value: string | boolean }[];
  },
) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (options?.tenantColumn && options.tenantId) {
    q = q.eq(options.tenantColumn, options.tenantId);
  }
  for (const f of options?.filters ?? []) {
    if (f.op === 'eq') q = q.eq(f.column, f.value);
    if (f.op === 'gte') q = q.gte(f.column, f.value);
    if (f.op === 'lte') q = q.lte(f.column, f.value);
    if (f.op === 'lt') q = q.lt(f.column, f.value);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function sumLedgerIncome(
  supabase: SupabaseClient,
  tenantId: string,
  from?: string,
  to?: string,
) {
  let q = supabase
    .from('FinanceLedgerEntry')
    .select('amountMinor')
    .eq('tenantId', tenantId)
    .eq('entryType', 'INCOME');
  if (from) q = q.gte('occurredOn', from.slice(0, 10));
  if (to) q = q.lte('occurredOn', to.slice(0, 10));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.amountMinor ?? 0), 0);
}

export async function fetchAdminDashboardStats(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<AdminDashboardStats> {
  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const [
    students,
    teachers,
    teachersNewThisMonth,
    activeClasses,
    revenueMinor,
    revenueLastMonthMinor,
  ] = await Promise.all([
    countRows(supabase, 'students', {
      tenantColumn: 'tenant_id',
      tenantId,
    }),
    countTeachers(supabase, tenantId),
    countTeachersCreatedSince(supabase, tenantId, thisMonth.start),
    countRows(supabase, 'classes', {
      tenantColumn: 'tenant_id',
      tenantId,
      filters: [{ column: 'status', op: 'eq', value: 'active' }],
    }),
    sumLedgerIncome(supabase, tenantId),
    sumLedgerIncome(supabase, tenantId, lastMonth.start, lastMonth.end),
  ]);

  const studentsAtStartOfMonth = await countRows(supabase, 'students', {
    tenantColumn: 'tenant_id',
    tenantId,
    filters: [{ column: 'created_at', op: 'lt', value: thisMonth.start }],
  });

  const revenueThisMonthMinor = await sumLedgerIncome(
    supabase,
    tenantId,
    thisMonth.start,
    thisMonth.end,
  );
  const revenuePrevMonthMinor = revenueLastMonthMinor;

  return {
    students,
    studentsGrowthPercent: percentChange(students, studentsAtStartOfMonth),
    teachers,
    teachersNewThisMonth,
    activeClasses,
    revenueMinor,
    revenueGrowthPercent: percentChange(revenueThisMonthMinor, revenuePrevMonthMinor),
  };
}

async function countTeachers(supabase: SupabaseClient, tenantId: string) {
  const { count, error } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if (!error) return count ?? 0;

  return countRows(supabase, 'StaffProfile', {
    tenantColumn: 'tenantId',
    tenantId,
    filters: [{ column: 'isActive', op: 'eq', value: true }],
  });
}

async function countTeachersCreatedSince(
  supabase: SupabaseClient,
  tenantId: string,
  since: string,
) {
  const { count, error } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', since);
  if (!error) return count ?? 0;

  return countRows(supabase, 'StaffProfile', {
    tenantColumn: 'tenantId',
    tenantId,
    filters: [{ column: 'createdAt', op: 'gte', value: since }],
  });
}

function categorizeActivity(action: string): AdminActivityItem['category'] {
  const lower = action.toLowerCase();
  if (lower.includes('login') || lower.includes('sign')) return 'auth';
  if (lower.includes('exam') || lower.includes('class') || lower.includes('subject')) {
    return 'academic';
  }
  if (lower.includes('report')) return 'report';
  return 'general';
}

function activityFromLog(row: {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}): AdminActivityItem {
  const title = row.action;
  const description = row.details?.trim() || `${row.action} recorded successfully`;
  return {
    id: row.id,
    title,
    description,
    createdAt: row.created_at,
    category: categorizeActivity(row.action),
  };
}

export async function fetchAdminRecentActivities(
  supabase: SupabaseClient,
  tenantId: string,
  limit = 8,
): Promise<AdminActivityItem[]> {
  const { data: logs, error: logsError } = await supabase
    .from('user_activity_logs')
    .select('id, action, details, created_at, users!inner(tenant_id)')
    .eq('users.tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!logsError && logs && logs.length > 0) {
    return logs.map((row) =>
      activityFromLog({
        id: row.id,
        action: row.action,
        details: row.details,
        created_at: row.created_at,
      }),
    );
  }

  const activities: AdminActivityItem[] = [];

  const { data: recentLogins } = await supabase
    .from('users')
    .select('id, name, last_login')
    .eq('tenant_id', tenantId)
    .not('last_login', 'is', null)
    .order('last_login', { ascending: false })
    .limit(3);

  for (const user of recentLogins ?? []) {
    if (!user.last_login) continue;
    activities.push({
      id: `login-${user.id}`,
      title: 'User logged in',
      description: `${user.name} signed in successfully`,
      createdAt: user.last_login,
      category: 'auth',
    });
  }

  const { data: recentStudents } = await supabase
    .from('students')
    .select('id, first_name, last_name, class_name, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(3);

  for (const student of recentStudents ?? []) {
    activities.push({
      id: `student-${student.id}`,
      title: `Enrolled ${student.first_name} ${student.last_name}`,
      description: student.class_name
        ? `Added to ${student.class_name}`
        : 'Student record created',
      createdAt: student.created_at,
      category: 'academic',
    });
  }

  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
