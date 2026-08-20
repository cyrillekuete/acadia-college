'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import {
  TimetableSlotFormDialog,
  type TimetableSlotRecord,
} from '@/components/acadia/timetable/timetable-slot-form-dialog';
import {
  dayOfWeekLabel,
  formatTimeRange,
} from '@/lib/acadia/timetable';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import { TIMETABLE_SLOT_LIST_SELECT } from '@/lib/supabase/queries/timetable';
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
  const [deleteTarget, setDeleteTarget] = useState<TimetableSlotRecord | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<TimetableSlotRecord | null>(
    null,
  );

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['subject-timetable', tenantId, subjectId, activeYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let query = supabase
        .from('TimetableSlot')
        .select(TIMETABLE_SLOT_LIST_SELECT)
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
      return (data ?? []) as Array<
        TimetableSlotRecord & {
          Room?: unknown;
          StaffProfile?: unknown;
          Class?: unknown;
        }
      >;
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      isError,
      session,
      tenantId,
    ),
  });

  const slotRecords = useMemo(
    () =>
      slots.map(
        (row): TimetableSlotRecord => ({
          id: row.id as string,
          academicYearId: row.academicYearId as string,
          classId: (row.classId as string | null) ?? null,
          subjectId: row.subjectId as string,
          staffProfileId: row.staffProfileId as string,
          roomId: row.roomId as string,
          dayOfWeek: row.dayOfWeek as number,
          startMinutes: row.startMinutes as number,
          endMinutes: row.endMinutes as number,
        }),
      ),
    [slots],
  );

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <>
      <RecordDetailCard
        title="Timetable slots"
        fields={
          slots.length === 0
            ? [{ label: 'Slots', value: 'No timetable slots for this subject.' }]
            : slots.map((row, index) => {
                const room = unwrapRelation<{ code?: string; nameEn?: string }>(
                  row.Room,
                );
                const staff = unwrapRelation<{
                  staffCode?: string;
                  User?: unknown;
                }>(row.StaffProfile);
                const user = unwrapRelation<{ name?: string }>(staff?.User);
                const classRow = unwrapRelation<{ name?: string }>(row.Class);
                const teacher = user?.name ?? staff?.staffCode ?? '—';
                const roomLabel = room?.code ?? room?.nameEn ?? '—';
                const record = slotRecords[index]!;
                return {
                  label: dayOfWeekLabel(row.dayOfWeek as number),
                  value: (
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {formatTimeRange(
                          row.startMinutes as number,
                          row.endMinutes as number,
                        )}{' '}
                        · {classRow?.name ?? '—'} · {teacher} ·{' '}
                        {formatRecordValue(roomLabel)}
                      </span>
                      {canManage ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditTarget(record)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deleteTimetableSlot.isPending}
                            onClick={() => setDeleteTarget(record)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ),
                };
              })
        }
      />

      <TimetableSlotFormDialog
        open={editTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        record={editTarget}
        defaultSubjectId={subjectId}
      />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete timetable slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the slot from the weekly timetable. Slots linked to
              attendance sessions cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTimetableSlot.isPending}
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                deleteTimetableSlot.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              Delete slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
