'use client';

import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { StudentList } from '@/components/acadia/student/student-list';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

export default function StudentsPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Students"
      description="Manage student accounts and records."
      actions={
        canAdd ? (
          <Button asChild size="sm">
            <Link href="/students/new">
              <Plus className="size-4" />
              Add student
            </Link>
          </Button>
        ) : undefined
      }
    >
      <StudentList />
    </AcadiaPageShell>
  );
}
