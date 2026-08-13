'use client';

import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { StudentRegistry } from '@/components/acadia/student/student-registry';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteRegistry, isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';

export default function StudentsPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);
  const isTeacherView =
    isStaffOrTeacher(session?.roleSlug) && !isAdmin(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('students.title')}
      description={
        isTeacherView
          ? t('students.teacherDescription')
          : t('students.description')
      }
      actions={
        canAdd ? (
          <Button asChild size="sm">
            <Link href="/students/new">
              <Plus className="size-4" />
              {t('students.add')}
            </Link>
          </Button>
        ) : undefined
      }
    >
      <StudentRegistry />
    </AcadiaPageShell>
  );
}
