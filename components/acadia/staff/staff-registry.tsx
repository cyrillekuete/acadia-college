'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StaffList } from '@/components/acadia/staff/staff-list';
import { StaffRegistryFiltersPanel } from '@/components/acadia/staff/staff-registry-filters';
import { StaffRegistryStats } from '@/components/acadia/staff/staff-registry-stats';
import type { DummyStaff } from '@/lib/acadia/dummy-staff';
import {
  EMPTY_STAFF_REGISTRY_FILTERS,
  computeStaffRegistryStats,
  filterStaffRegistry,
  getStaffSubjectOptions,
  type StaffRegistryFilters,
} from '@/lib/acadia/staff-registry';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchStaffList } from '@/lib/supabase/queries/staff-list';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export function StaffRegistry() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYear, activeYearId } = useActiveAcademicYear();

  const { data: remoteStaff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-list', tenantId, activeYearId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      return fetchStaffList(supabase, tenantId, activeYearId);
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const listSource = useMemo((): DummyStaff[] => {
    if (staffLoading) {
      return [];
    }
    if (remoteStaff != null) {
      return remoteStaff;
    }
    return [];
  }, [remoteStaff, staffLoading]);

  const [filters, setFilters] = useState<StaffRegistryFilters>(
    EMPTY_STAFF_REGISTRY_FILTERS,
  );

  const activeYearLabel = activeYear?.label ?? null;

  const stats = useMemo(
    () => computeStaffRegistryStats(listSource, activeYearLabel),
    [listSource, activeYearLabel],
  );

  const filteredStaff = useMemo(
    () => filterStaffRegistry(listSource, filters),
    [listSource, filters],
  );

  const subjectOptions = useMemo(
    () => getStaffSubjectOptions(listSource),
    [listSource],
  );

  return (
    <div className="space-y-7.5">
      <StaffRegistryStats stats={stats} isLoading={staffLoading} />
      <StaffRegistryFiltersPanel
        filters={filters}
        onChange={setFilters}
        subjectOptions={subjectOptions}
      />
      <StaffList
        staff={filteredStaff}
        isLoading={staffLoading && listSource.length === 0}
      />
    </div>
  );
}
