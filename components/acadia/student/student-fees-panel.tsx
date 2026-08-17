'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FeeAccountInstallments } from '@/components/acadia/finance/fee-account-installments';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { requireBrowserClient } from '@/lib/supabase/client';
import { ensureStudentFeeAccount } from '@/lib/acadia/fee-account-provision';
import type { CreateStudentFeeAccountValues } from '@/lib/acadia/finance-schemas';
import { useTranslation } from '@/hooks/useTranslation';

type EnrollmentRow = {
  id: string;
  classId: string | null;
  subSystem: CreateStudentFeeAccountValues['subSystem'];
  branch: CreateStudentFeeAccountValues['branch'];
};

export function StudentFeesPanel({
  studentProfileId,
}: {
  studentProfileId: string;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.profile?.id ?? null;
  const { activeYearId, isLoading: yearLoading } = useActiveAcademicYear();

  const query = useQuery({
    queryKey: ['student-fee-account', tenantId, studentProfileId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [accountRes, enrollmentRes] = await Promise.all([
        supabase
          .from('StudentFeeAccount')
          .select('id')
          .eq('tenantId', tenantId!)
          .eq('studentProfileId', studentProfileId)
          .eq('academicYearId', activeYearId!)
          .maybeSingle(),
        supabase
          .from('StudentEnrollment')
          .select('id, classId, subSystem, branch')
          .eq('tenantId', tenantId!)
          .eq('studentProfileId', studentProfileId)
          .eq('academicYearId', activeYearId!)
          .maybeSingle(),
      ]);
      if (accountRes.error) {
        throw accountRes.error;
      }
      if (enrollmentRes.error) {
        throw enrollmentRes.error;
      }

      const enrollment = enrollmentRes.data as EnrollmentRow | null;
      const classId = enrollment?.classId?.trim() || '';
      let hasFeePlan = false;
      if (classId) {
        const { data: plan, error: planError } = await supabase
          .from('StreamFeePlanClass')
          .select('id')
          .eq('tenantId', tenantId!)
          .eq('academicYearId', activeYearId!)
          .eq('classId', classId)
          .maybeSingle();
        if (planError) {
          throw planError;
        }
        hasFeePlan = !!plan?.id;
      }

      let accountId = accountRes.data?.id ?? null;
      if (!accountId && enrollment && hasFeePlan && classId) {
        const result = await ensureStudentFeeAccount(supabase, {
          tenantId: tenantId!,
          studentProfileId,
          academicYearId: activeYearId!,
          subSystem: enrollment.subSystem,
          branch: enrollment.branch,
          studentEnrollmentId: enrollment.id,
          classId,
          actorUserId,
        });
        if (result.ok) {
          accountId = result.accountId;
        }
      }

      return {
        accountId,
        enrollment,
        hasFeePlan,
      };
    },
    enabled:
      !!studentProfileId &&
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  if (yearLoading || sessionLoading || query.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!activeYearId) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('finance.selectYearFirst')}
      </p>
    );
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">
        {getQueryErrorMessage(query.error)}
      </p>
    );
  }

  if (query.data?.accountId) {
    return <FeeAccountInstallments accountId={query.data.accountId} />;
  }

  const classId = query.data?.enrollment?.classId?.trim();

  if (!classId) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('finance.noClassAssigned')}
      </p>
    );
  }

  if (!query.data?.hasFeePlan) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('finance.noFeePlanForClass')}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/fees/setup">{t('finance.setupFeePlan')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {t('finance.noStudentFeeAccountDescription')}
    </p>
  );
}
