'use client';

import { useQuery } from '@tanstack/react-query';
import { DeletedProfileList } from '@/components/acadia/registry/deleted-profile-list';
import { useStudentMutations } from '@/hooks/use-student-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchDeletedStudents } from '@/lib/supabase/queries/students-list';

export function DeletedStudentsSection() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { restoreStudent, purgeStudent } = useStudentMutations();

  const { data, isLoading } = useQuery({
    queryKey: ['deleted-students', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchDeletedStudents(supabase, tenantId!);
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId),
  });

  const pendingId =
    (restoreStudent.isPending ? restoreStudent.variables?.profileId : null) ??
    (purgeStudent.isPending ? purgeStudent.variables?.profileId : null);

  return (
    <DeletedProfileList
      rows={(data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.studentId,
        deletedAt: row.deletedAt,
      }))}
      isLoading={isLoading}
      idColumnLabel={t('students.studentId')}
      emptyMessage={t('students.deletedEmpty')}
      pendingId={pendingId}
      onRestore={(id) => restoreStudent.mutate({ profileId: id })}
      onPurge={(id) => purgeStudent.mutate({ profileId: id })}
    />
  );
}
