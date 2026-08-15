import { Suspense } from 'react';
import { StudentsPageView } from '@/components/acadia/student/students-page-view';
import { getCachedStudentsList } from '@/lib/acadia/cache/queries';
import { getCachedPageContext, loadCachedValue } from '@/lib/acadia/cache/load';
import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsCachedPage />
    </Suspense>
  );
}

async function StudentsCachedPage() {
  const ctx = await getCachedPageContext();
  const isTeacherView =
    !!ctx && isStaffOrTeacher(ctx.roleSlug) && !isAdmin(ctx.roleSlug);

  if (!ctx?.yearId || isTeacherView) {
    return <StudentsPageView seedYearId={ctx?.yearId ?? null} />;
  }

  const initialStudents = await loadCachedValue(() =>
    getCachedStudentsList(ctx.tenantId, ctx.yearId!),
  );

  return (
    <StudentsPageView
      initialStudents={initialStudents}
      seedYearId={ctx.yearId}
    />
  );
}
