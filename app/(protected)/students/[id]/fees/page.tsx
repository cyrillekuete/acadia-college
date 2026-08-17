'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { StudentFeesPanel } from '@/components/acadia/student/student-fees-panel';
import { useStudent } from '@/components/acadia/student/student-context';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentFeesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { student, isLoading } = useStudent();
  const { data: session, isLoading: sessionLoading } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);

  useEffect(() => {
    if (!sessionLoading && !canManage) {
      router.replace(pathname.replace(/\/fees\/?$/, '') || '/students');
    }
  }, [canManage, pathname, router, sessionLoading]);

  if (isLoading || sessionLoading || !student?.profileId) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!canManage) {
    return null;
  }

  return <StudentFeesPanel studentProfileId={student.profileId} />;
}
