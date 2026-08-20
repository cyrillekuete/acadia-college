'use client';

import { StudentAcademicProgress } from '@/components/acadia/student/student-academic-progress';
import { StudentClassMigrationDialog } from '@/components/acadia/student/student-class-migration-dialog';
import { StudentDangerZone } from '@/components/acadia/student/student-danger-zone';
import { StudentDownloadCredentialsButton } from '@/components/acadia/student/student-download-credentials-button';
import { StudentExamsCertificates } from '@/components/acadia/student/student-exams-certificates';
import { StudentProfile } from '@/components/acadia/student/student-profile';
import { useStudent } from '@/components/acadia/student/student-context';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

export default function StudentDetailPage() {
  const { student, isLoading } = useStudent();
  const { data: session } = useAcadiaCollegeSession();
  const canEdit = canWriteRegistry(session?.roleSlug);
  const profileId = student?.profileId;

  return (
    <div className="space-y-10">
      <StudentProfile student={student} isLoading={isLoading} />
      {profileId && student?.userId ? (
        <>
          <StudentAcademicProgress studentProfileId={profileId} />
          <StudentExamsCertificates studentProfileId={profileId} />
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <StudentDownloadCredentialsButton profileId={profileId} />
              <StudentClassMigrationDialog
                profileId={profileId}
                subSystem={(student.subsystem ?? 'ENGLISH').toUpperCase()}
                branch={(student.branch ?? 'GRAMMAR').toUpperCase()}
              />
            </div>
          ) : null}
        </>
      ) : null}
      {canEdit ? (
        <StudentDangerZone student={student} isLoading={isLoading} />
      ) : null}
    </div>
  );
}
