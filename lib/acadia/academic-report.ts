import {
  computeStudentSubjectAverages,
  isPassingScore,
  rankStudents,
  type StudentAverage,
  type SubjectMarkSnapshot,
} from '@/lib/acadia/assessment';
import { unwrapRelation } from '@/lib/acadia/record-display';

export type AcademicReportEnrollmentProfile = {
  registrationNumber?: string | null;
  User?: unknown;
};

export type AcademicReportRow = StudentAverage & {
  name: string;
  registrationNumber: string;
  passing: boolean;
};

/**
 * Rank only ENROLLED students in the selected cohort.
 * Marks for withdrawn / other-level students are ignored for ranking.
 */
export function buildAcademicReportRankings(input: {
  snapshots: SubjectMarkSnapshot[];
  enrolledStudentIds: ReadonlySet<string>;
  enrollmentByStudent: Map<string, AcademicReportEnrollmentProfile | undefined>;
}): AcademicReportRow[] {
  const cohortSnapshots = input.snapshots.filter((snapshot) =>
    input.enrolledStudentIds.has(snapshot.studentProfileId),
  );

  const averages = computeStudentSubjectAverages(cohortSnapshots);

  const courseCountByStudent = new Map<string, number>();
  for (const snapshot of cohortSnapshots) {
    const key = `${snapshot.studentProfileId}:${snapshot.subjectId}`;
    courseCountByStudent.set(key, 1);
  }
  const subjectCounts = new Map<string, number>();
  for (const key of Array.from(courseCountByStudent.keys())) {
    const studentId = key.split(':')[0]!;
    subjectCounts.set(studentId, (subjectCounts.get(studentId) ?? 0) + 1);
  }

  const ranked = rankStudents(
    Array.from(averages.entries()).map(([studentProfileId, average]) => ({
      studentProfileId,
      average,
      courseCount: subjectCounts.get(studentProfileId) ?? 0,
    })),
  );

  return ranked.map((row) => {
    const profile = input.enrollmentByStudent.get(row.studentProfileId);
    const user = unwrapRelation<{ name?: string }>(profile?.User);
    return {
      ...row,
      name:
        user?.name?.trim() ||
        profile?.registrationNumber?.trim() ||
        row.studentProfileId,
      registrationNumber: profile?.registrationNumber?.trim() || '—',
      passing: isPassingScore(row.average),
    };
  });
}
