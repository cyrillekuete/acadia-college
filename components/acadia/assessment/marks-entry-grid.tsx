'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { computeTotalScore, formatMarkScore } from '@/lib/acadia/assessment';
import type { CourseMarkEntryValues } from '@/lib/acadia/assessment-schemas';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';
import { useCourseOptions } from '@/hooks/use-course-catalog-options';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

type StudentRow = {
  id: string;
  registrationNumber: string;
  User?: unknown;
};

type MarkDraft = CourseMarkEntryValues & {
  totalPreview: number | null;
};

export type MarksEntryPreset = {
  academicYearId: string;
  sequenceId: string;
  courseId: string;
  examSessionId: string;
  readOnly?: boolean;
};

export function MarksEntryGrid({ preset }: { preset?: MarksEntryPreset }) {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const [academicYearId, setAcademicYearId] = useState(preset?.academicYearId ?? '');
  const [sequenceId, setSequenceId] = useState(preset?.sequenceId ?? '');
  const [courseId, setCourseId] = useState(preset?.courseId ?? '');
  const [examSessionId, setExamSessionId] = useState(preset?.examSessionId ?? '');
  const [drafts, setDrafts] = useState<Record<string, MarkDraft>>({});

  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: courses = [] } = useCourseOptions(academicYearId);
  const { ensureSequenceExamSession, saveMarksEntry } = useAssessmentMutations();

  const selectedSequence = sequences.find((s) => s.id === sequenceId);

  useEffect(() => {
    if (preset) {
      setAcademicYearId(preset.academicYearId);
      setSequenceId(preset.sequenceId);
      setCourseId(preset.courseId);
      setExamSessionId(preset.examSessionId);
      return;
    }
    if (!academicYearId && years.length > 0) {
      const current = years.find((y) => y.isCurrent);
      setAcademicYearId(current?.id ?? years[0].id);
    }
  }, [years, academicYearId, preset]);

  const rosterQuery = useQuery({
    queryKey: [
      'marks-entry',
      tenantId,
      academicYearId,
      courseId,
      examSessionId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();

      const { data: course, error: courseError } = await supabase
        .from('Course')
        .select('specialtyId, levelId')
        .eq('id', courseId)
        .single();
      if (courseError) {
        throw courseError;
      }

      const { data: enrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          studentProfileId,
          StudentProfile:studentProfileId (
            id,
            registrationNumber,
            User:userId ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', academicYearId)
        .eq('specialtyId', course.specialtyId)
        .eq('levelId', course.levelId)
        .eq('status', 'ACTIVE');

      if (enrollError) {
        throw enrollError;
      }

      const students: StudentRow[] = (enrollments ?? []).map((row) => {
        const profile = unwrapRelation<StudentRow>(row.StudentProfile);
        return profile ?? { id: row.studentProfileId as string, registrationNumber: '—' };
      });

      const { data: marks, error: marksError } = await supabase
        .from('CourseMark')
        .select('id, studentProfileId, caScore, examScore, isResitEligible')
        .eq('tenantId', tenantId!)
        .eq('examSessionId', examSessionId)
        .eq('courseId', courseId);

      if (marksError) {
        throw marksError;
      }

      return { students, marks: marks ?? [] };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId &&
      !!courseId &&
      !!examSessionId,
  });

  useEffect(() => {
    if (!rosterQuery.data) {
      return;
    }
    const markByStudent = new Map(
      rosterQuery.data.marks.map((m) => [m.studentProfileId as string, m]),
    );
    const next: Record<string, MarkDraft> = {};
    for (const student of rosterQuery.data.students) {
      const existing = markByStudent.get(student.id);
      const caScore = existing?.caScore != null ? Number(existing.caScore) : null;
      const examScore =
        existing?.examScore != null ? Number(existing.examScore) : null;
      next[student.id] = {
        studentProfileId: student.id,
        caScore,
        examScore,
        isResitEligible: existing?.isResitEligible ?? false,
        totalPreview: computeTotalScore(caScore, examScore),
      };
    }
    setDrafts(next);
  }, [rosterQuery.data]);

  const handleLoadSession = async () => {
    if (!selectedSequence || !courseId || !academicYearId) {
      return;
    }
    const id = await ensureSequenceExamSession.mutateAsync({
      academicYearId,
      courseId,
      termId: selectedSequence.termId,
      sequenceId: selectedSequence.id,
    });
    setExamSessionId(id);
  };

  const updateDraft = (
    studentId: string,
    patch: Partial<Pick<MarkDraft, 'caScore' | 'examScore' | 'isResitEligible'>>,
  ) => {
    setDrafts((prev) => {
      const current = prev[studentId];
      if (!current) {
        return prev;
      }
      const caScore = patch.caScore !== undefined ? patch.caScore : current.caScore;
      const examScore =
        patch.examScore !== undefined ? patch.examScore : current.examScore;
      return {
        ...prev,
        [studentId]: {
          ...current,
          ...patch,
          caScore,
          examScore,
          totalPreview: computeTotalScore(caScore, examScore),
        },
      };
    });
  };

  const handleSave = async () => {
    if (!examSessionId || !courseId || !academicYearId) {
      return;
    }
    await saveMarksEntry.mutateAsync({
      academicYearId,
      sequenceId,
      courseId,
      examSessionId,
      marks: Object.values(drafts),
    });
  };

  const studentRows = useMemo(
    () => rosterQuery.data?.students ?? [],
    [rosterQuery.data?.students],
  );

  const readOnly = preset?.readOnly ?? false;

  return (
    <div className="space-y-6">
      {!preset ? (
      <div className="flex flex-wrap gap-4 items-end">
        <div className="min-w-[180px]">
          <p className="text-sm font-medium mb-1.5">Academic year</p>
          <Select value={academicYearId} onValueChange={setAcademicYearId}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">Sequence</p>
          <Select value={sequenceId} onValueChange={setSequenceId}>
            <SelectTrigger>
              <SelectValue placeholder="Sequence" />
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
          <p className="text-sm font-medium mb-1.5">Course</p>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={
            !sequenceId ||
            !courseId ||
            ensureSequenceExamSession.isPending
          }
          onClick={() => void handleLoadSession()}
        >
          {ensureSequenceExamSession.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            'Load class roster'
          )}
        </Button>
      </div>
      ) : null}

      {examSessionId ? (
        <>
          {rosterQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading roster…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>CA (/20)</TableHead>
                  <TableHead>Exam (/20)</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Resit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRows.map((student) => {
                  const user = unwrapRelation<{ name?: string }>(student.User);
                  const draft = drafts[student.id];
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <span className="font-medium">
                          {user?.name ?? student.registrationNumber}
                        </span>
                        <span className="text-muted-foreground text-xs block">
                          {student.registrationNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          className="w-24"
                          value={draft?.caScore ?? ''}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateDraft(student.id, {
                              caScore:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          className="w-24"
                          value={draft?.examScore ?? ''}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateDraft(student.id, {
                              examScore:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>{formatMarkScore(draft?.totalPreview)}</TableCell>
                      <TableCell>
                        <Checkbox
                          disabled={readOnly}
                          checked={draft?.isResitEligible ?? false}
                          onCheckedChange={(checked) =>
                            updateDraft(student.id, {
                              isResitEligible: checked === true,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!readOnly ? (
          <Button
            type="button"
            disabled={saveMarksEntry.isPending || studentRows.length === 0}
            onClick={() => void handleSave()}
          >
            {saveMarksEntry.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              'Save marks'
            )}
          </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

