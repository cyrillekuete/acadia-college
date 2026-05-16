'use client';

import { Book, FileText, GraduationCap, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  DashboardStatCard,
  formatDashboardStatValue,
} from '@/components/acadia/dashboard-stat-card';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchAdminDashboardStats } from '@/lib/supabase/queries/stats';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export default function AdminDashboardPage() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      return fetchAdminDashboardStats(supabase, tenantId);
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  return (
    <AcadiaPageShell
      title="Acadia College — Admin dashboard"
      description="Welcome to Acadia College. Tenant-wide overview for administrators."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DashboardStatCard
          title="Students"
          value={formatDashboardStatValue(stats?.students)}
          icon={Users}
        />
        <DashboardStatCard
          title="Staff"
          value={formatDashboardStatValue(stats?.staff)}
          icon={GraduationCap}
        />
        <DashboardStatCard
          title="Courses"
          value={formatDashboardStatValue(stats?.courses)}
          icon={Book}
        />
        <DashboardStatCard
          title="Applications"
          value={formatDashboardStatValue(stats?.applications)}
          icon={FileText}
        />
        <DashboardStatCard
          title="Enrollments"
          value={formatDashboardStatValue(stats?.enrollments)}
          icon={FileText}
        />
      </div>
    </AcadiaPageShell>
  );
}
