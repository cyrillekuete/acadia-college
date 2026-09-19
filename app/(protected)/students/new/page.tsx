'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/common/container';
import { StudentCreateForm } from '@/components/acadia/student/student-create-form';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

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
    <Container className="py-2">
      <StudentCreateForm />
    </Container>
  );
}
