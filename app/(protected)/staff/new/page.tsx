'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarDescription,
} from '@/partials/common/toolbar';
import { StaffCreateForm } from '@/components/acadia/staff/staff-create-form';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { Button } from '@/components/ui/button';

export default function NewStaffPage() {
  const router = useRouter();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  useEffect(() => {
    if (!isLoading && !canAdd) {
      router.replace('/staff');
    }
  }, [isLoading, canAdd, router]);

  if (isLoading || !canAdd) {
    return null;
  }

  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Add teacher</ToolbarPageTitle>
          <ToolbarDescription>
            Register a new teacher, assign subjects and classes, and download login credentials
            (Teacher ID, system email, and temporary password).
          </ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          <Button asChild variant="outline" size="sm">
            <Link href="/staff">Back to staff</Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <StaffCreateForm />
    </Container>
  );
}
