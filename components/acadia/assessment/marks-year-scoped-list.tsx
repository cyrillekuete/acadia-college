'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MARKS_TABLE_LAYOUT } from '@/components/acadia/assessment/marks-table-layout';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useExamSessionIdsForActiveYear } from '@/hooks/use-exam-session-ids-for-year';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { useLinkedGuardianStudents } from '@/hooks/use-linked-guardian-students';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useTeacherStudents } from '@/hooks/use-teacher-students';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  buildMarksViewerScope,
  filterSubjectsForTeacherScope,
  markRowInScope,
} from '@/lib/acadia/marks-access';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { isAdmin, isGuardian, isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

type MarksListRow = {
  id: string;
  studentProfileId?: string;
  subjectId?: string;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  isResitEligible?: boolean | null;
  updatedAt?: string | null;
  Subject?: unknown;
  StudentProfile?: unknown;
  ExamSession?: unknown;
} & Record<string, unknown>;

const ALL = '__all__';

export function MarksYearScopedList() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const roleSlug = session?.roleSlug ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const { data: examSessionIds = [], isLoading } = useExamSessionIdsForActiveYear();
  const { data: sequences = [] } = useSequenceOptions(activeYearId);
  const { data: allSubjects = [] } = useSubjectOptions(activeYearId);
  const { data: teacherStudents } = useTeacherStudents();
  const { data: linkedProfile } = useLinkedAcadiaProfile();
  const { data: linkedStudents = [] } = useLinkedGuardianStudents({
    enabled: isGuardian(roleSlug),
  });
  const [subjectFilter, setSubjectFilter] = useState(ALL);
  const [sequenceFilter, setSequenceFilter] = useState(ALL);

  const viewerScope = useMemo(() => {
    const isTeacherScoped = isStaffOrTeacher(roleSlug) && !isAdmin(roleSlug);
    return buildMarksViewerScope({
      roleSlug,
      teacherSubjectIds: isTeacherScoped
        ? teacherStudents?.scope.subjectIds
        : undefined,
      teacherClassIds: isTeacherScoped ? teacherStudents?.scope.classIds : undefined,
      teacherStudentProfileIds: isTeacherScoped
        ? teacherStudents?.students.map((student) => student.id)
        : undefined,
      ownStudentProfileId: isStudent(roleSlug)
        ? linkedProfile?.studentProfileId
        : null,
      linkedStudentProfileIds: isGuardian(roleSlug)
        ? linkedStudents.map((student) => student.studentProfileId)
        : undefined,
    });
  }, [roleSlug, teacherStudents, linkedProfile, linkedStudents]);

  const subjects = useMemo(
    () => filterSubjectsForTeacherScope(allSubjects, viewerScope),
    [allSubjects, viewerScope],
  );

  const columns = useMemo<ColumnDef<MarksListRow>[]>(
    () => [
      {
        id: 'studentName',
        accessorFn: (row) => {
          const profile = unwrapRelation<{ User?: unknown }>(row.StudentProfile);
          const user = unwrapRelation<{ name?: string }>(profile?.User);
          return user?.name ?? '';
        },
        header: t('marks.student'),
        cell: ({ row }) => {
          const profile = unwrapRelation<{
            registrationNumber?: string;
            User?: unknown;
          }>(row.original.StudentProfile);
          const user = unwrapRelation<{ name?: string }>(profile?.User);
          return (
            <div>
              <span className="font-medium">
                {user?.name?.trim() || profile?.registrationNumber || '—'}
              </span>
              <span className="block text-xs text-muted-foreground">
                {profile?.registrationNumber || '—'}
              </span>
            </div>
          );
        },
        size: 220,
      },
      {
        ...nestedFieldColumn<MarksListRow>(
          'subject',
          t('marks.subject'),
          'Subject',
          'code',
        ),
        size: 120,
      } as ColumnDef<MarksListRow>,
      {
        id: 'sequence',
        accessorFn: (row) => {
          const exam = unwrapRelation<{ AcademicSequence?: unknown }>(
            row.ExamSession,
          );
          const seq = unwrapRelation<{ number?: number }>(exam?.AcademicSequence);
          return seq?.number ?? '';
        },
        header: t('marks.sequence'),
        cell: ({ getValue }) => {
          const value = getValue();
          return value === '' || value == null
            ? '—'
            : t('marks.sequenceNumber', { number: value });
        },
        size: 110,
      },
      { accessorKey: 'caScore', header: t('marks.caShort'), size: 80 },
      { accessorKey: 'examScore', header: t('marks.examShort'), size: 80 },
      { accessorKey: 'totalScore', header: t('marks.total'), size: 80 },
      {
        id: 'resit',
        accessorKey: 'isResitEligible',
        header: t('marks.resit'),
        cell: ({ getValue }) =>
          getValue() ? t('common.labels.yes') : t('common.labels.no'),
        size: 80,
      },
      { accessorKey: 'updatedAt', header: t('marks.updated'), size: 180 },
    ],
    [t],
  );

  const select = `
    id,
    studentProfileId,
    subjectId,
    caScore,
    examScore,
    totalScore,
    isResitEligible,
    updatedAt,
    Subject!SubjectMark_subjectId_tenantId_fkey ( code ),
    StudentProfile!SubjectMark_studentProfileId_tenantId_fkey (
      registrationNumber,
      User!StudentProfile_userId_tenantId_fkey ( name )
    ),
    ExamSession!SubjectMark_examSessionId_tenantId_fkey (
      sequenceId,
      AcademicSequence:sequenceId ( number )
    )
  `;

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground p-5">{t('marks.loadingYear')}</p>
    );
  }

  if (examSessionIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-5">
        {t('marks.noExamSessions')}
      </p>
    );
  }

  if (
    !viewerScope.unrestricted &&
    (viewerScope.studentProfileIds?.length ?? 0) === 0 &&
    (viewerScope.subjectIds?.length ?? 0) === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground p-5">{t('marks.noScopedMarks')}</p>
    );
  }

  const studentOnlyInFilter =
    !viewerScope.unrestricted &&
    viewerScope.studentProfileIds != null &&
    viewerScope.subjectIds == null &&
    viewerScope.studentProfileIds.length > 0
      ? [{ column: 'studentProfileId', values: viewerScope.studentProfileIds }]
      : [];

  const subjectInFilter =
    !viewerScope.unrestricted &&
    viewerScope.subjectIds != null &&
    viewerScope.studentProfileIds == null &&
    viewerScope.subjectIds.length > 0
      ? [{ column: 'subjectId', values: viewerScope.subjectIds }]
      : [];

  const teacherOrFilter =
    !viewerScope.unrestricted &&
    viewerScope.subjectIds != null &&
    viewerScope.studentProfileIds != null
      ? (() => {
          const parts: string[] = [];
          if (viewerScope.subjectIds.length > 0) {
            parts.push(`subjectId.in.(${viewerScope.subjectIds.join(',')})`);
          }
          if (viewerScope.studentProfileIds.length > 0) {
            parts.push(
              `studentProfileId.in.(${viewerScope.studentProfileIds.join(',')})`,
            );
          }
          return parts.length > 0 ? parts.join(',') : 'id.eq.__none__';
        })()
      : undefined;

  return (
    <SupabaseTableList<MarksListRow>
      table="SubjectMark"
      title={t('marks.allMarks')}
      select={select}
      columns={columns}
      searchFn={(row, query) => {
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(row.StudentProfile);
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        const subject = unwrapRelation<{ code?: string }>(row.Subject);
        const haystack = [
          user?.name,
          profile?.registrationNumber,
          subject?.code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      }}
      rowFilter={(row) => {
        if (!markRowInScope(row, viewerScope)) {
          return false;
        }
        if (subjectFilter !== ALL && row.subjectId !== subjectFilter) {
          return false;
        }
        if (sequenceFilter !== ALL) {
          const exam = unwrapRelation<{ sequenceId?: string }>(row.ExamSession);
          if ((exam?.sequenceId ?? '') !== sequenceFilter) {
            return false;
          }
        }
        return true;
      }}
      inFilters={[
        { column: 'examSessionId', values: examSessionIds },
        ...studentOnlyInFilter,
        ...subjectInFilter,
      ]}
      or={teacherOrFilter}
      order={{ column: 'updatedAt', ascending: false }}
      limit={1000}
      truncatedLabel={t('marks.listTruncated', { limit: 1000 })}
      emptyMessage={t('marks.noMarksYet')}
      toolbarExtra={
        <div className="flex flex-wrap gap-3">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[11rem]">
              <SelectValue placeholder={t('marks.subject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('marks.allSubjects')}</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sequenceFilter} onValueChange={setSequenceFilter}>
            <SelectTrigger className="w-[11rem]">
              <SelectValue placeholder={t('marks.sequence')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('marks.allSequences')}</SelectItem>
              {sequences.map((sequence) => (
                <SelectItem key={sequence.id} value={sequence.id}>
                  {sequenceOptionLabel(sequence)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      tableLayout={MARKS_TABLE_LAYOUT}
    />
  );
}
