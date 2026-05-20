'use client';

import { useQuery } from '@tanstack/react-query';
import { Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  dayOfWeekLabel,
  formatTimeRange,
} from '@/lib/acadia/timetable';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { Skeleton } from '@/components/ui/skeleton';

export function SubjectTimetablePanel({
  subjectId,
  canManage = true,
}: {
  subjectId: string;
  canManage?: boolean;
}) {
  const { deleteTimetableSlot } = useSubjectMutations();
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['subject-timetable', tenantId, subjectId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('TimetableSlot')
        .select(
          `
          id,
          dayOfWeek,
          startMinutes,
          endMinutes,
          Room!TimetableSlot_roomId_tenantId_fkey ( code, nameEn ),
          StaffProfile!TimetableSlot_staffProfileId_tenantId_fkey ( staffCode, User!StaffProfile_userId_tenantId_fkey ( name ) )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('subjectId', subjectId);
      if (activeYearId) {
        query = query.eq('academicYearId', activeYearId);
      }
      const { data, error } = await query
        .order('dayOfWeek', { ascending: true })
        .order('startMinutes', { ascending: true });
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      isError,
      session,
      tenantId,
    ),
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <RecordDetailCard
      title="Timetable slots"
      fields={
        slots.length === 0
          ? [{ label: 'Slots', value: 'No timetable slots for this subject.' }]
          : slots.map((row) => {
              const room = unwrapRelation<{ code?: string; nameEn?: string }>(
                row.Room,
              );
              const staff = unwrapRelation<{
                staffCode?: string;
                User?: unknown;
              }>(row.StaffProfile);
              const user = unwrapRelation<{ name?: string }>(staff?.User);
              const teacher = user?.name ?? staff?.staffCode ?? '—';
              const roomLabel = room?.code ?? room?.nameEn ?? '—';
              return {
                label: dayOfWeekLabel(row.dayOfWeek as number),
                value: (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {formatTimeRange(
                        row.startMinutes as number,
                        row.endMinutes as number,
                      )}{' '}
                      · {teacher} · {formatRecordValue(roomLabel)}
                    </span>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deleteTimetableSlot.isPending}
                        onClick={() =>
                          deleteTimetableSlot.mutate(row.id as string)
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                ),
              };
            })
      }
    />
  );
}
