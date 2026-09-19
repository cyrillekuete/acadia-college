'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/common/container';
import { StaffCreateForm } from '@/components/acadia/staff/staff-create-form';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

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
    <Container className="py-2">
      <StaffCreateForm />
    </Container>
  );
}
