'use client';

import { useQuery } from '@tanstack/react-query';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { StudentFeesPanel } from '@/components/acadia/student/student-fees-panel';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { isGuardian, isStudent } from '@/lib/acadia/roles';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyFeesPage() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.authUser?.id ?? null;
  const { data: linked, isLoading: linkedLoading } = useLinkedAcadiaProfile();
  const { activeYearId } = useActiveAcademicYear();
  const guardian = isGuardian(session?.roleSlug);
  const student = isStudent(session?.roleSlug);

  const childrenQuery = useQuery({
    queryKey: ['guardian-fee-children', tenantId, userId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('GuardianStudentLink')
        .select(
          `
          studentProfileId,
          StudentProfile!GuardianStudentLink_studentProfileId_tenantId_fkey (
            id,
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('guardianUserId', userId!)
        .is('consentRevokedAt', null);
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const profile = unwrapRelation<{
          id?: string;
          registrationNumber?: string;
          User?: unknown;
        }>(row.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          studentProfileId: String(row.studentProfileId),
          name: user?.name ?? profile?.registrationNumber ?? String(row.studentProfileId),
        };
      });
    },
    enabled:
      guardian &&
      !!userId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  if (sessionLoading || linkedLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <AcadiaPageShell
      title={t('finance.myFeesTitle')}
      description={t('finance.myFeesDescription')}
    >
      {student && linked?.studentProfileId ? (
        <StudentFeesPanel
          studentProfileId={linked.studentProfileId}
          readOnly
          autoProvision={false}
        />
      ) : null}
      {guardian ? (
        childrenQuery.isError ? (
          <p className="text-sm text-destructive">
            {getQueryErrorMessage(childrenQuery.error)}
          </p>
        ) : childrenQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (childrenQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('finance.noStudentFeeAccount')}
          </p>
        ) : (
          <div className="space-y-8">
            {(childrenQuery.data ?? []).map((child) => (
              <section key={child.studentProfileId} className="space-y-3">
                <h2 className="text-base font-semibold">{child.name}</h2>
                <StudentFeesPanel
                  studentProfileId={child.studentProfileId}
                  readOnly
                  autoProvision={false}
                />
              </section>
            ))}
          </div>
        )
      ) : null}
      {!student && !guardian ? (
        <p className="text-sm text-muted-foreground">
          {t('common.messages.accessDenied')}
        </p>
      ) : null}
      {student && !linked?.studentProfileId ? (
        <p className="text-sm text-muted-foreground">
          {t('finance.noStudentFeeAccount')}
        </p>
      ) : null}
      {!activeYearId ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t('finance.selectYearFirst')}
        </p>
      ) : null}
    </AcadiaPageShell>
  );
}
