'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ClassAbsencesGrid } from '@/components/acadia/report-cards/class-absences-grid';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteAcademicAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';

export default function ClassAbsencesPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canEnter =
    canWriteAcademicAdmin(session?.roleSlug) || isStaffOrTeacher(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('reports.absencesTitle')}
      description={t('reports.absencesDescription')}
    >
      {canEnter ? (
        <ClassAbsencesGrid />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('reports.absencesNoPermission')}
        </p>
      )}
    </AcadiaPageShell>
  );
}
