'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/partials/common/toolbar';
import { StudentCreateForm } from '@/components/acadia/student/student-create-form';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewStudentPage() {
  const router = useRouter();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  useEffect(() => {
    if (!isLoading && !canAdd) {
      router.replace('/students');
    }
  }, [isLoading, canAdd, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Add student</ToolbarPageTitle>
          <ToolbarDescription>
            Creates the student account, sends a password-setup email, and links a parent or guardian.
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline" size="sm">
            <Link href="/students">Back to students</Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <StudentCreateForm />
    </Container>
  );
}
