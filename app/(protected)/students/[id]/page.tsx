'use client';

import { StudentDangerZone } from '@/components/acadia/student/student-danger-zone';
import { StudentProfile } from '@/components/acadia/student/student-profile';
import { useStudent } from '@/components/acadia/student/student-context';

export default function StudentDetailPage() {
  const { student, isLoading } = useStudent();

  return (
    <div className="space-y-10">
      <StudentProfile student={student} isLoading={isLoading} />
      <StudentDangerZone student={student} isLoading={isLoading} />
    </div>
  );
}
