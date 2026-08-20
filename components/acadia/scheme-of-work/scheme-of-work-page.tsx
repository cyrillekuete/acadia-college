'use client';

import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminSchemeCatalog } from '@/components/acadia/scheme-of-work/admin-scheme-catalog';
import { SchemeListCards } from '@/components/acadia/scheme-of-work/scheme-list-cards';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  useStudentSchemeList,
  useTeacherSchemeList,
} from '@/hooks/use-scheme-of-work';
import { canWriteAcademicAdmin, isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

function TeacherSchemeList() {
  const { t } = useTranslation();
  const query = useTeacherSchemeList();

  if (query.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{t('schemeOfWork.loadFailed')}</p>
    );
  }
  return <SchemeListCards items={query.data ?? []} />;
}

function StudentSchemeList() {
  const { t } = useTranslation();
  const query = useStudentSchemeList();

  if (query.profileLoading || query.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (query.profileError || query.isError) {
    return (
      <p className="text-sm text-destructive">{t('schemeOfWork.loadFailed')}</p>
    );
  }
  if (!query.classId) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('schemeOfWork.noEnrollment')}
      </p>
    );
  }
  return <SchemeListCards items={query.data ?? []} />;
}

export function SchemeOfWorkPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const admin = canWriteAcademicAdmin(session?.roleSlug);
  const teacher = isStaffOrTeacher(session?.roleSlug) && !admin;
  const student = isStudent(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('schemeOfWork.title')}
      description={
        admin
          ? t('schemeOfWork.adminDescription')
          : teacher
            ? t('schemeOfWork.teacherDescription')
            : t('schemeOfWork.studentDescription')
      }
      actions={<CurrentAcademicYearBadge />}
    >
      {admin ? <AdminSchemeCatalog /> : null}
      {teacher ? <TeacherSchemeList /> : null}
      {student ? <StudentSchemeList /> : null}
      {!admin && !teacher && !student ? (
        <p className="text-sm text-muted-foreground">
          {t('schemeOfWork.noAccess')}
        </p>
      ) : null}
    </AcadiaPageShell>
  );
}
