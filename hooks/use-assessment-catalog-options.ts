'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type SequenceOption = {
  id: string;
  number: number;
  numberInTerm: number;
  termId: string;
  academicYearId: string;
};

export type ExamSessionOption = {
  id: string;
  type: string;
  subjectId: string;
  sequenceId: string | null;
  startsOn: string;
  endsOn: string;
  finalizedAt: string | null;
};

export function useSequenceOptions(academicYearId?: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery({
    queryKey: ['sequence-options', tenantId, academicYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('AcademicSequence')
        .select('id, number, numberInTerm, termId, academicYearId')
        .eq('tenantId', tenantId!)
        .order('number', { ascending: true });
      if (academicYearId) {
        query = query.eq('academicYearId', academicYearId);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as SequenceOption[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      (academicYearId === undefined ||
        (typeof academicYearId === 'string' && academicYearId.length > 0)),
  });
}

export function sequenceOptionLabel(seq: SequenceOption): string {
  return `Sequence ${seq.number} (Term ${seq.numberInTerm === 1 ? '1st' : '2nd'} half)`;
}

export function useExamSessionOptions(filters?: {
  academicYearId?: string | null;
  subjectId?: string | null;
  sequenceId?: string | null;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const academicYearId = filters?.academicYearId;
  const subjectId = filters?.subjectId;
  const sequenceId = filters?.sequenceId;

  return useQuery({
    queryKey: [
      'exam-session-options',
      tenantId,
      academicYearId,
      subjectId,
      sequenceId,
    ],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('ExamSession')
        .select(
          'id, type, subjectId, sequenceId, startsOn, endsOn, finalizedAt, academicYearId',
        )
        .eq('tenantId', tenantId!)
        .order('startsOn', { ascending: false });

      if (academicYearId) {
        query = query.eq('academicYearId', academicYearId);
      }
      if (subjectId) {
        query = query.eq('subjectId', subjectId);
      }
      if (sequenceId) {
        query = query.eq('sequenceId', sequenceId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data ?? []) as ExamSessionOption[];
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });
}
