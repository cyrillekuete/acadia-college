'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { computeTotalScore, formatMarkScore } from '@/lib/acadia/assessment';
import type { SubjectMarkEntryValues } from '@/lib/acadia/assessment-schemas';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useAssessmentMutations } from '@/hooks/use-assessment-mutations';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

type StudentRow = {
  id: string;
  registrationNumber: string;
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
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const academicYearId = preset?.academicYearId ?? activeYearId ?? '';
  const [sequenceId, setSequenceId] = useState(preset?.sequenceId ?? '');
  const [subjectId, setSubjectId] = useState(preset?.subjectId ?? '');
  const [examSessionId, setExamSessionId] = useState(preset?.examSessionId ?? '');
  const [drafts, setDrafts] = useState<Record<string, MarkDraft>>({});

  const { data: sequences = [] } = useSequenceOptions(academicYearId);
  const { data: subjects = [] } = useSubjectOptions(academicYearId);
  const { ensureSequenceExamSession, saveMarksEntry } = useAssessmentMutations();

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
        .select('specialtyId, levelId')
        .eq('id', subjectId)
        .single();
      if (subjectError) {
        throw subjectError;
      }

      const { data: enrollments, error: enrollError } = await supabase
        .from('StudentEnrollment')
        .select(
          `
          studentProfileId,
          StudentProfile!StudentEnrollment_studentProfileId_tenantId_fkey (
            id,
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', academicYearId!)
        .eq('specialtyId', subject.specialtyId)
        .eq('levelId', subject.levelId)
        .eq('status', 'ENROLLED');

      if (enrollError) {
        throw enrollError;
      }

      const students: StudentRow[] = (enrollments ?? []).map((row) => {
        const profile = unwrapRelation<StudentRow>(row.StudentProfile);
        return profile ?? { id: row.studentProfileId as string, registrationNumber: '—' };
      });

      const { data: marks, error: marksError } = await supabase
        .from('SubjectMark')
        .select('id, studentProfileId, caScore, examScore, isResitEligible')
        .eq('tenantId', tenantId!)
        .eq('examSessionId', examSessionId)
        .eq('subjectId', subjectId);

      if (marksError) {
        throw marksError;
      }

      return { students, marks: marks ?? [] };
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!academicYearId &&
      !!subjectId &&
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
    if (!examSessionId || !subjectId || !academicYearId) {
      return;
    }
    await saveMarksEntry.mutateAsync({
      academicYearId,
      sequenceId,
      subjectId,
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
        <CurrentAcademicYearBadge />
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
          <p className="text-sm font-medium mb-1.5">Subject</p>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
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

