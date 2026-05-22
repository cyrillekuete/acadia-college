'use client';

import Link from 'next/link';
import { MoveLeft } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { StudentEditForm } from '@/components/acadia/student/student-edit-form';
import { useStudent } from '@/components/acadia/student/student-context';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentEditPage() {
  const { student, isLoading } = useStudent();
  const { data: session } = useAcadiaCollegeSession();
  const router = useRouter();
  const canEdit = canWriteRegistry(session?.roleSlug);

  useEffect(() => {
    if (!canEdit && session) {
      router.replace(student ? `/students/${student.id}` : '/students');
    }
  }, [canEdit, session, router, student]);

  if (isLoading || !student) {
    return null;
  }

  if (!student.userId) {
    return (
      <p className="text-sm text-muted-foreground">
        This student record cannot be edited here. Complete enrollment via the
        applications workflow or contact an administrator.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/students/${student.id}`}>
          <MoveLeft className="size-4" />
          Back to profile
        </Link>
      </Button>
      <StudentEditForm
        student={{
          profileId: student.profileId,
          userId: student.userId,
          registrationNumber: student.registrationNumber,
          matriculeNumber: student.matricule_number,
          isActive: student.status === 'active',
          alumniDirectoryOptIn: student.alumniDirectoryOptIn,
          alumniSince: student.alumniSince,
          name: `${student.first_name} ${student.last_name}`.trim(),
          email: student.email,
          country: student.country,
          timezone: student.timezone,
        }}
      />
    </div>
  );
}
