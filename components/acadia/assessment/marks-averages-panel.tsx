'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  computeStudentSubjectAverages,
  formatMarkScore,
  isPassingScore,
  rankStudents,
} from '@/lib/acadia/assessment';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';

export function MarksAveragesPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const [sequenceId, setSequenceId] = useState('');

  const { data: sequences = [] } = useSequenceOptions(activeYearId ?? '');

  const query = useQuery({
    queryKey: ['marks-averages', tenantId, activeYearId, sequenceId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let examQuery = supabase
        .from('ExamSession')
        .select('id')
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!);
      if (sequenceId) {
        examQuery = examQuery.eq('sequenceId', sequenceId);
      }
      const { data: sessions, error: sessionError } = await examQuery;
      if (sessionError) {
        throw sessionError;
      }
      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        return [];
      }

      const { data: marks, error: marksError } = await supabase
        .from('SubjectMark')
        .select(
          `
          studentProfileId,
          totalScore,
          StudentProfile!SubjectMark_studentProfileId_tenantId_fkey (
            registrationNumber,
            User!StudentProfile_userId_tenantId_fkey ( name )
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .in('examSessionId', sessionIds);

      if (marksError) {
        throw marksError;
      }

      const averages = computeStudentSubjectAverages(
        (marks ?? []).map((m) => ({
          studentProfileId: m.studentProfileId as string,
          subjectId: '',
          totalScore:
            m.totalScore != null ? Number(m.totalScore) : null,
        })),
      );

      const ranked = rankStudents(
        Array.from(averages.entries()).map(([studentProfileId, average]) => ({
          studentProfileId,
          average,
        })),
      );

      const profileById = new Map(
        (marks ?? []).map((m) => [m.studentProfileId as string, m.StudentProfile]),
      );

      return ranked.map((row) => {
        const profile = unwrapRelation<{
          registrationNumber?: string;
          User?: unknown;
        }>(profileById.get(row.studentProfileId));
        const user = unwrapRelation<{ name?: string }>(profile?.User);
        return {
          ...row,
          name: user?.name ?? profile?.registrationNumber ?? row.studentProfileId,
          registrationNumber: profile?.registrationNumber ?? '—',
          passing: isPassingScore(row.average),
        };
      });
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      !!activeYearId,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <CurrentAcademicYearBadge />
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">Sequence (optional)</p>
          <Select
            value={sequenceId || '__all__'}
            onValueChange={(v) => setSequenceId(v === '__all__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sequences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sequences in year</SelectItem>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {sequenceOptionLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Calculating averages…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No marks for this scope yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Average</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.studentProfileId}>
                <TableCell>{row.rank}</TableCell>
                <TableCell>
                  <span className="font-medium">{row.name}</span>
                  <span className="text-xs text-muted-foreground block">
                    {row.registrationNumber}
                  </span>
                </TableCell>
                <TableCell>{formatMarkScore(row.average)}</TableCell>
                <TableCell>{row.passing ? 'Pass' : 'Below 10'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
