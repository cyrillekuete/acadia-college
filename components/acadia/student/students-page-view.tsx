'use client';

import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { StudentRegistry } from '@/components/acadia/student/student-registry';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteRegistry } from '@/lib/acadia/roles';
import type { StudentListItem } from '@/lib/acadia/student-list-item';

export function StudentsPageView({
  initialStudents,
  seedYearId,
}: {
  initialStudents?: StudentListItem[];
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  return (
    <StudentRegistry
      initialStudents={initialStudents}
      seedYearId={seedYearId}
      extraActions={
        canAdd ? (
          <Button asChild size="sm">
            <Link href="/students/new">
              <Plus className="size-4" />
              {t('students.add')}
            </Link>
          </Button>
        ) : undefined
      }
    />
  );
}
