'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { DeletedStudentsSection } from '@/components/acadia/registry/deleted-students-section';
import {
  RegistrySectionTabs,
  type RegistrySection,
} from '@/components/acadia/registry/registry-section-tabs';
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
  const [section, setSection] = useState<RegistrySection>('directory');
  const showingDirectory = !canAdd || section === 'directory';

  return (
    <StudentRegistry
      initialStudents={initialStudents}
      seedYearId={seedYearId}
      sectionTabs={
        canAdd ? (
          <RegistrySectionTabs value={section} onChange={setSection} />
        ) : null
      }
      deletedSection={showingDirectory ? null : <DeletedStudentsSection />}
      extraActions={
        canAdd && showingDirectory ? (
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
