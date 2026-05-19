'use client';

import { useQuery } from '@tanstack/react-query';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  formatDateTime,
  formatRecordValue,
  levelLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { Skeleton } from '@/components/ui/skeleton';

export function StudentAcademicProgress({
  studentProfileId,
}: {
  studentProfileId: string;
}) {
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['student-academic-progress', tenantId, studentProfileId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [enrollmentsRes, marksRes] = await Promise.all([
        supabase
          .from('StudentEnrollment')
          .select(
            `
            id,
            status,
            createdAt,
            AcademicYear:academicYearId ( label ),
            Specialty:specialtyId ( code, nameEn ),
            Level:levelId ( number, labelEn )
          `,
          )
          .eq('tenantId', tenantId!)
          .eq('studentProfileId', studentProfileId)
          .order('createdAt', { ascending: false }),
        supabase
          .from('CourseMark')
          .select(
            `
            id,
            caScore,
            examScore,
            totalScore,
            createdAt,
            Course:courseId ( code, nameEn ),
            ExamSession:examSessionId ( type, startsOn )
          `,
          )
          .eq('tenantId', tenantId!)
          .eq('studentProfileId', studentProfileId)
          .order('createdAt', { ascending: false })
          .limit(20),
      ]);

      if (enrollmentsRes.error) {
        throw enrollmentsRes.error;
      }
      if (marksRes.error) {
        throw marksRes.error;
      }

      return {
        enrollments: enrollmentsRes.data ?? [],
        marks: marksRes.data ?? [],
      };
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      isError,
      session,
      tenantId,
    ),
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const enrollments = data?.enrollments ?? [];
  const marks = data?.marks ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <RecordDetailCard
        title="Enrollments by year"
        fields={
          enrollments.length === 0
            ? [{ label: 'Records', value: 'No enrollments yet.' }]
            : enrollments.map((row, index) => {
                const year = unwrapRelation<{ label?: string }>(row.AcademicYear);
                const specialty = unwrapRelation<{ nameEn?: string; code?: string }>(
                  row.Specialty,
                );
                const level = unwrapRelation<{ number?: number; labelEn?: string }>(
                  row.Level,
                );
                return {
                  label: year?.label ?? `Enrollment ${index + 1}`,
                  value: `${formatRecordValue(row.status)} · ${specialtyLabel(specialty)} · ${levelLabel(level)} · ${formatDateTime(row.createdAt)}`,
                };
              })
        }
      />
      <RecordDetailCard
        title="Recent marks"
        fields={
          marks.length === 0
            ? [{ label: 'Records', value: 'No marks recorded yet.' }]
            : marks.map((row, index) => {
                const course = unwrapRelation<{ code?: string; nameEn?: string }>(
                  row.Course,
                );
                const exam = unwrapRelation<{ type?: string; startsOn?: string }>(
                  row.ExamSession,
                );
                const courseLabel =
                  course?.code ?? course?.nameEn ?? `Mark ${index + 1}`;
                const score = formatRecordValue(
                  row.totalScore ?? row.examScore ?? row.caScore,
                );
                return {
                  label: courseLabel,
                  value: `${score}${exam?.type ? ` · ${exam.type}` : ''} · ${formatDateTime(row.createdAt)}`,
                };
              })
        }
      />
    </div>
  );
}
