'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { MarksDataGrid } from '@/components/acadia/assessment/marks-data-grid';
import { computeTotalScore, canEditExamSession, formatMarkScore } from '@/lib/acadia/assessment';
import type { SubjectMarkEntryValues } from '@/lib/acadia/assessment-schemas';
import {
  columnsForStudent,
  markDraftKey,
  resolveMarksEntryColumns,
  resolveStudentBranchIds,
  type MarksEntryColumn,
} from '@/lib/acadia/marks-entry';
import {
  buildMarksViewerScope,
  filterRosterForTeacherScope,
  filterSubjectsForTeacherScope,
} from '@/lib/acadia/marks-access';
import { isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useTeacherStudents } from '@/hooks/use-teacher-students';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

type StudentRow = {
  id: string;
  registrationNumber: string;
  classId: string | null;
  User?: unknown;
};

type MarkDraft = SubjectMarkEntryValues & {
  totalPreview: number | null;
};

export type MarksEntryPreset = {
  academicYearId: string;
  sequenceId: string;
  subjectId: string;
  examSessionId: string;
  readOnly?: boolean;
};

export function MarksEntryGrid({ preset }: { preset?: MarksEntryPreset }) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const roleSlug = session?.roleSlug ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const academicYearId = preset?.academicYearId ?? activeYearId ?? '';
  const [sequenceId, setSequenceId] = useState(preset?.sequenceId ?? '');
  const [subjectId, setSubjectId] = useState(preset?.subjectId ?? '');
  const [examSessionId, setExamSessionId] = useState(preset?.examSessionId ?? '');
  const [classFilterId, setClassFilterId] = useState<string>('all');
  const [drafts, setDrafts] = useState<Record<string, MarkDraft>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(['student', 'resit']);

  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: allSubjects = [] } = useSubjectOptions(academicYearId);
  const { data: teacherStudents } = useTeacherStudents();
  const { ensureSequenceExamSession, saveMarksEntry } = useAssessmentMutations();

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
    });
  }, [roleSlug, teacherStudents]);

  const subjects = useMemo(
    () => filterSubjectsForTeacherScope(allSubjects, viewerScope),
    [allSubjects, viewerScope],
  );

  const classFilterOptions = useMemo(() => {
    const pairs = [
      ...(teacherStudents?.scope.pairs ?? []),
      ...(teacherStudents?.scope.classMaster ?? []),
    ];
    const byId = new Map<string, string>();
    for (const pair of pairs) {
      if (pair.classId) {
        byId.set(pair.classId, pair.className || pair.classId);
      }
    }
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [teacherStudents]);

  const selectedSequence = sequences.find((s) => s.id === sequenceId);

  useEffect(() => {
    if (preset) {
      setSequenceId(preset.sequenceId);
      setSubjectId(preset.subjectId);
      setExamSessionId(preset.examSessionId);
    }
  }, [preset]);

  const rosterQuery = useQuery({
    queryKey: [
      'marks-entry',
      tenantId,
      academicYearId,
      subjectId,
      examSessionId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();

      const { data: subject, error: subjectError } = await supabase
        .from('Subject')
        .select('subSystem, branch, levelId, hasSubBranches')
        .eq('id', subjectId)
        .single();
      if (subjectError) {
        throw subjectError;
      }

      const { data: subjectLevels, error: levelError } = await supabase
        .from('SubjectLevel')
        .select('levelId')
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId);
      if (levelError) {
        throw levelError;
      }
      const levelIds = (subjectLevels ?? []).map((row) => row.levelId as string);
      const rosterLevelIds = levelIds.length > 0 ? levelIds : [subject.levelId];

      const { data: enrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          studentProfileId,
          classId,
          StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
            id,
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', academicYearId!)
        .eq('subSystem', subject.subSystem)
        .eq('branch', subject.branch)
        .in('levelId', rosterLevelIds)
        .eq('status', 'ENROLLED');

      if (enrollError) {
        throw enrollError;
      }

      const students: StudentRow[] = (enrollments ?? []).map((row) => {
        const profile = unwrapRelation<StudentRow>(row.StudentProfile);
        return {
          id: profile?.id ?? (row.studentProfileId as string),
          registrationNumber: profile?.registrationNumber ?? '—',
          classId: (row.classId as string | null) ?? null,
          User: profile?.User,
        };
      });

      const { data: subBranches, error: branchError } = await supabase
        .from('SubjectSubBranch')
        .select('id, name, sortOrder')
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId)
        .order('sortOrder', { ascending: true });
      if (branchError) {
        throw branchError;
      }

      const { data: classBranches, error: classBranchError } = await supabase
        .from('ClassSubjectSubBranch')
        .select('classId, subjectSubBranchId')
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId);
      if (classBranchError) {
        throw classBranchError;
      }

      const assignedByClass = new Map<string, string[]>();
      for (const row of classBranches ?? []) {
        const classId = row.classId as string;
        const list = assignedByClass.get(classId) ?? [];
        list.push(row.subjectSubBranchId as string);
        assignedByClass.set(classId, list);
      }

      const { data: marks, error: marksError } = await supabase
        .from('SubjectMark')
        .select(
          'id, studentProfileId, subjectSubBranchId, caScore, examScore, isResitEligible, updatedAt',
        )
        .eq('tenantId', tenantId!)
        .eq('examSessionId', examSessionId)
        .eq('subjectId', subjectId);

      if (marksError) {
        throw marksError;
      }

      const { data: examSession, error: examSessionError } = await supabase
        .from('ExamSession')
        .select('finalizedAt')
        .eq('id', examSessionId)
        .eq('tenantId', tenantId!)
        .maybeSingle();
      if (examSessionError) {
        throw examSessionError;
      }

      return {
        students,
        marks: marks ?? [],
        subBranches: (subBranches ?? []).map((branch) => ({
          id: branch.id as string,
          name: branch.name as string,
        })),
        assignedByClass,
        finalizedAt: (examSession?.finalizedAt as string | null) ?? null,
      };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId &&
      !!subjectId &&
      !!examSessionId,
  });

  const entryColumns = useMemo(
    () =>
      resolveMarksEntryColumns({
        subBranches: rosterQuery.data?.subBranches ?? [],
        assignedByClass: rosterQuery.data?.assignedByClass ?? new Map(),
        studentClassIds: (rosterQuery.data?.students ?? []).map((student) => student.classId),
      }),
    [rosterQuery.data],
  );

  useEffect(() => {
    if (!rosterQuery.data) {
      return;
    }
    const markByKey = new Map(
      rosterQuery.data.marks.map((mark) => [
        markDraftKey(
          mark.studentProfileId as string,
          (mark.subjectSubBranchId as string | null) ?? null,
        ),
        mark,
      ]),
    );
    const next: Record<string, MarkDraft> = {};
    for (const student of rosterQuery.data.students) {
      const branchIds = resolveStudentBranchIds(
        student.classId,
        rosterQuery.data.assignedByClass,
      );
      const columns = columnsForStudent(entryColumns, branchIds);
      for (const column of columns) {
        const key = markDraftKey(student.id, column.id);
        const existing = markByKey.get(key);
        const caScore = existing?.caScore != null ? Number(existing.caScore) : null;
        const examScore =
          existing?.examScore != null ? Number(existing.examScore) : null;
        next[key] = {
          studentProfileId: student.id,
          subjectSubBranchId: column.id,
          caScore,
          examScore,
          isResitEligible: existing?.isResitEligible ?? false,
          expectedUpdatedAt: (existing?.updatedAt as string | null | undefined) ?? null,
          totalPreview: computeTotalScore(caScore, examScore),
        };
      }
    }
    setDrafts(next);
  }, [rosterQuery.data, entryColumns]);

  useEffect(() => {
    const order = [
      'student',
      ...entryColumns.flatMap((column) => {
        const suffix = column.id ?? 'subject';
        return [`ca-${suffix}`, `exam-${suffix}`, `total-${suffix}`];
      }),
      'resit',
    ];
    setColumnOrder(order);
  }, [entryColumns]);

  const handleLoadSession = async () => {
    if (!selectedSequence || !subjectId || !academicYearId) {
      return;
    }
    const id = await ensureSequenceExamSession.mutateAsync({
      academicYearId,
      subjectId,
      termId: selectedSequence.termId,
      sequenceId: selectedSequence.id,
    });
    setExamSessionId(id);
  };

  const updateDraft = (
    studentId: string,
    subjectSubBranchId: string | null,
    patch: Partial<Pick<MarkDraft, 'caScore' | 'examScore' | 'isResitEligible'>>,
  ) => {
    const key = markDraftKey(studentId, subjectSubBranchId);
    setDrafts((prev) => {
      const current = prev[key];
      if (!current) {
        return prev;
      }
      const caScore = patch.caScore !== undefined ? patch.caScore : current.caScore;
      const examScore =
        patch.examScore !== undefined ? patch.examScore : current.examScore;
      const next = {
        ...prev,
        [key]: {
          ...current,
          ...patch,
          caScore,
          examScore,
          totalPreview: computeTotalScore(caScore, examScore),
        },
      };
      if (patch.isResitEligible !== undefined) {
        for (const [draftKey, draft] of Object.entries(next)) {
          if (draft.studentProfileId === studentId) {
            next[draftKey] = { ...draft, isResitEligible: patch.isResitEligible };
          }
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!examSessionId || !subjectId || !academicYearId) {
      return;
    }
    await saveMarksEntry.mutateAsync({
      academicYearId,
      sequenceId,
      subjectId,
      examSessionId,
      marks: Object.values(drafts).map(({ totalPreview: _preview, ...mark }) => mark),
    });
  };

  const studentRows = useMemo(() => {
    const scoped = filterRosterForTeacherScope(
      rosterQuery.data?.students ?? [],
      viewerScope,
    );
    if (classFilterId === 'all') {
      return scoped;
    }
    return scoped.filter((student) => student.classId === classFilterId);
  }, [rosterQuery.data?.students, viewerScope, classFilterId]);

  const sessionFinalized = !canEditExamSession(rosterQuery.data?.finalizedAt);
  const readOnly = (preset?.readOnly ?? false) || sessionFinalized;

  const columns = useMemo<ColumnDef<StudentRow>[]>(() => {
    const scoreColumns: ColumnDef<StudentRow>[] = entryColumns.flatMap((column) => {
      const suffix = column.id ?? 'subject';
      const titlePrefix = column.id ? `${column.name} ` : '';
      return [
        {
          id: `ca-${suffix}`,
          accessorFn: (row) => drafts[markDraftKey(row.id, column.id)]?.caScore ?? '',
          header: ({ column: tableColumn }) => (
            <DataGridColumnHeader
              title={`${titlePrefix}${t('marks.caScore')}`}
              visibility
              column={tableColumn}
            />
          ),
          cell: ({ row }) => {
            if (!studentCanEditColumn(row.original, column, rosterQuery.data?.assignedByClass)) {
              return '—';
            }
            const key = markDraftKey(row.original.id, column.id);
            return (
              <Input
                type="number"
                min={0}
                max={20}
                step={0.25}
                className="w-24"
                value={drafts[key]?.caScore ?? ''}
                disabled={readOnly}
                onChange={(e) =>
                  updateDraft(row.original.id, column.id, {
                    caScore: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            );
          },
          size: 140,
          enableSorting: false,
        },
        {
          id: `exam-${suffix}`,
          accessorFn: (row) => drafts[markDraftKey(row.id, column.id)]?.examScore ?? '',
          header: ({ column: tableColumn }) => (
            <DataGridColumnHeader
              title={`${titlePrefix}${t('marks.examScore')}`}
              visibility
              column={tableColumn}
            />
          ),
          cell: ({ row }) => {
            if (!studentCanEditColumn(row.original, column, rosterQuery.data?.assignedByClass)) {
              return '—';
            }
            const key = markDraftKey(row.original.id, column.id);
            return (
              <Input
                type="number"
                min={0}
                max={20}
                step={0.25}
                className="w-24"
                value={drafts[key]?.examScore ?? ''}
                disabled={readOnly}
                onChange={(e) =>
                  updateDraft(row.original.id, column.id, {
                    examScore: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            );
          },
          size: 140,
          enableSorting: false,
        },
        {
          id: `total-${suffix}`,
          accessorFn: (row) => drafts[markDraftKey(row.id, column.id)]?.totalPreview ?? null,
          header: ({ column: tableColumn }) => (
            <DataGridColumnHeader
              title={`${titlePrefix}${t('marks.total')}`}
              visibility
              column={tableColumn}
            />
          ),
          cell: ({ row }) => {
            if (!studentCanEditColumn(row.original, column, rosterQuery.data?.assignedByClass)) {
              return '—';
            }
            return formatMarkScore(
              drafts[markDraftKey(row.original.id, column.id)]?.totalPreview,
            );
          },
          size: 100,
          enableSorting: false,
        },
      ];
    });

    return [
      {
        id: 'student',
        accessorFn: (row) => {
          const user = unwrapRelation<{ name?: string }>(row.User);
          return user?.name ?? row.registrationNumber;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title={t('students.student')} visibility column={column} />
        ),
        cell: ({ row }) => {
          const user = unwrapRelation<{ name?: string }>(row.original.User);
          return (
            <>
              <span className="font-medium">
                {user?.name ?? row.original.registrationNumber}
              </span>
              <span className="text-muted-foreground text-xs block">
                {t('students.studentId')}: {row.original.registrationNumber}
              </span>
            </>
          );
        },
        size: 280,
        enableSorting: false,
      },
      ...scoreColumns,
      {
        id: 'resit',
        accessorFn: (row) => {
          const first = Object.values(drafts).find((draft) => draft.studentProfileId === row.id);
          return first?.isResitEligible ?? false;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title={t('marks.resit')} visibility column={column} />
        ),
        cell: ({ row }) => {
          const first = Object.values(drafts).find(
            (draft) => draft.studentProfileId === row.original.id,
          );
          return (
            <Checkbox
              disabled={readOnly}
              checked={first?.isResitEligible ?? false}
              onCheckedChange={(checked) =>
                updateDraft(row.original.id, first?.subjectSubBranchId ?? null, {
                  isResitEligible: checked === true,
                })
              }
            />
          );
        },
        size: 80,
        enableSorting: false,
      },
    ];
  }, [drafts, readOnly, t, entryColumns, rosterQuery.data?.assignedByClass]);

  const table = useReactTable({
    data: studentRows,
    columns,
    getRowId: (row) => row.id,
    state: {
      columnOrder,
      pagination: { pageIndex: 0, pageSize: Math.max(studentRows.length, 8) },
    },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {!preset ? (
      <div className="flex flex-wrap gap-4 items-end">
        <CurrentAcademicYearBadge label="Year" />
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">{t('marks.sequence')}</p>
          <Select value={sequenceId} onValueChange={setSequenceId}>
            <SelectTrigger>
              <SelectValue placeholder={t('marks.sequence')} />
            </SelectTrigger>
            <SelectContent>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {sequenceOptionLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">{t('marks.subject')}</p>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder={t('marks.subject')} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {classFilterOptions.length > 0 ? (
          <div className="min-w-[200px]">
            <p className="text-sm font-medium mb-1.5">{t('marks.classFilter')}</p>
            <Select value={classFilterId} onValueChange={setClassFilterId}>
              <SelectTrigger>
                <SelectValue placeholder={t('marks.classFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marks.allClasses')}</SelectItem>
                {classFilterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={
            !sequenceId ||
            !subjectId ||
            ensureSequenceExamSession.isPending
          }
          onClick={() => void handleLoadSession()}
        >
          {ensureSequenceExamSession.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            t('marks.loadRoster')
          )}
        </Button>
      </div>
      ) : null}

      {examSessionId && sessionFinalized ? (
        <p className="text-sm text-muted-foreground">{t('marks.sessionFinalizedReadonly')}</p>
      ) : null}

      {examSessionId ? (
        <>
          <MarksDataGrid
            table={table}
            recordCount={studentRows.length}
            isLoading={rosterQuery.isLoading}
            isError={rosterQuery.isError}
            error={rosterQuery.error}
            emptyMessage={t('marks.emptyRoster')}
            paginate={false}
          />

          {!readOnly ? (
          <Button
            type="button"
            disabled={saveMarksEntry.isPending || studentRows.length === 0}
            onClick={() => void handleSave()}
          >
            {saveMarksEntry.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              t('marks.saveMarks')
            )}
          </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function studentCanEditColumn(
  student: StudentRow,
  column: MarksEntryColumn,
  assignedByClass: Map<string, string[]> | undefined,
): boolean {
  const branchIds = resolveStudentBranchIds(
    student.classId,
    assignedByClass ?? new Map(),
  );
  if (branchIds == null) {
    return column.id == null;
  }
  return column.id != null && branchIds.includes(column.id);
}
