'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { classDisciplineSaveSchema } from '@/lib/acadia/class-discipline-schemas';
import {
  ensureAcademicYearWriteAllowed,
  isWriteCancelledError,
} from '@/lib/acadia/mutation-write-guard';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { useAcademicYearWriteGuard } from '@/hooks/use-academic-year-write-guard';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import { requireBrowserClient } from '@/lib/supabase/client';
import { upsertClassDisciplineRows } from '@/lib/supabase/queries/class-discipline';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function handleMutationError(error: unknown) {
  if (isWriteCancelledError(error)) {
    return;
  }
  toast.error(mutationErrorMessage(error));
}

export function useClassDisciplineMutations() {
  const queryClient = useQueryClient();
  const { confirmWrite } = useAcademicYearWriteGuard();
  const { data: session } = useAcadiaCollegeSession();
  const { data: linked } = useLinkedAcadiaProfile();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.authUser?.id ?? null;
  const staffProfileId = linked?.staffProfileId ?? null;

  const saveClassDiscipline = useMutation({
    mutationFn: async (values: {
      academicYearId: string;
      classId: string;
      termNumber: number;
      rows: Array<{
        studentProfileId: string;
        absenceHours: number;
        suspensions: number;
        warnings: number;
      }>;
    }) => {
      await ensureAcademicYearWriteAllowed(confirmWrite);
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const parsed = classDisciplineSaveSchema.parse(values);
      const supabase = requireBrowserClient();
      await upsertClassDisciplineRows(supabase, {
        tenantId,
        academicYearId: parsed.academicYearId,
        classId: parsed.classId,
        termNumber: parsed.termNumber,
        recordedByStaffProfileId: staffProfileId,
        rows: parsed.rows,
      });

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'student_term_discipline.saved',
          entityId: parsed.classId,
          entityType: 'StudentTermDiscipline',
          description: `Saved class discipline for term ${parsed.termNumber}`,
        });
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          'class-discipline-roster',
          tenantId,
          variables.academicYearId,
          variables.classId,
          variables.termNumber,
        ],
      });
      toast.success('Absences saved.');
    },
    onError: handleMutationError,
  });

  return { saveClassDiscipline };
}
