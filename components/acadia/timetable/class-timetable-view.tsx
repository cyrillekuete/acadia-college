'use client';

import { useEffect, useMemo, useState } from 'react';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import {
  TimetableSlotFormDialog,
  type TimetableSlotRecord,
} from '@/components/acadia/timetable/timetable-slot-form-dialog';
import { WeeklyTimetableGrid } from '@/components/acadia/timetable/weekly-timetable-grid';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { useActiveYearTimetablePublish } from '@/hooks/use-timetable-publish';
import { useTimetableSlotsForClass } from '@/hooks/use-timetable-slots';
import {
  mapTimetableRowToGridSlot,
  timetableGridSlotToRecord,
} from '@/lib/acadia/timetable-grid';
import { TimetablePublishControls } from '@/components/acadia/timetable/timetable-publish-controls';
import { TimetableUnpublishedNotice } from '@/components/acadia/timetable/timetable-unpublished-notice';

export function ClassTimetableView({
  canManage = false,
  initialClassId,
}: {
  canManage?: boolean;
  initialClassId?: string;
}) {
  const [classId, setClassId] = useState(initialClassId ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlotRecord | null>(null);
  const [defaultDayOfWeek, setDefaultDayOfWeek] = useState<number | undefined>();

  const { canView } = useActiveYearTimetablePublish();
  const slotsEnabled = canManage || canView;

  const { data: classes = [] } = useClassesForFilters();
  const { data: slotRows = [], isLoading } = useTimetableSlotsForClass(
    classId || null,
    { enabled: slotsEnabled },
  );
  const { deleteTimetableSlot } = useSubjectMutations();

  useEffect(() => {
    if (initialClassId) {
      setClassId(initialClassId);
    }
  }, [initialClassId]);

  useEffect(() => {
    if (classId || classes.length === 0) {
      return;
    }
    setClassId(classes[0]!.id as string);
  }, [classId, classes]);

  const gridSlots = useMemo(
    () => slotRows.map(mapTimetableRowToGridSlot),
    [slotRows],
  );

  function openCreateDialog(dayOfWeek?: number) {
    setEditingSlot(null);
    setDefaultDayOfWeek(dayOfWeek);
    setDialogOpen(true);
  }

  function openEditDialog(slot: ReturnType<typeof mapTimetableRowToGridSlot>) {
    setEditingSlot(timetableGridSlotToRecord(slot));
    setDefaultDayOfWeek(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {canManage ? <TimetablePublishControls /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <CurrentAcademicYearBadge />
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-full sm:w-[min(100%,20rem)]">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classRow) => (
                <SelectItem key={classRow.id} value={classRow.id}>
                  {classRow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage && classId ? (
          <Button type="button" onClick={() => openCreateDialog()}>
            New slot
          </Button>
        ) : null}
      </div>

      {!classId ? (
        <p className="text-sm text-muted-foreground">
          Select a class to view its weekly timetable.
        </p>
      ) : !canView ? (
        <TimetableUnpublishedNotice />
      ) : (
        <WeeklyTimetableGrid
          slots={gridSlots}
          isLoading={isLoading}
          canManage={canManage}
          onEditSlot={canManage ? openEditDialog : undefined}
          onDeleteSlot={
            canManage
              ? (slotId) => {
                  if (window.confirm('Delete this timetable slot?')) {
                    deleteTimetableSlot.mutate(slotId);
                  }
                }
              : undefined
          }
          onAddSlot={canManage ? openCreateDialog : undefined}
          emptyMessage="No timetable slots for this class yet."
        />
      )}

      {canManage ? (
        <TimetableSlotFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingSlot(null);
              setDefaultDayOfWeek(undefined);
            }
          }}
          record={editingSlot}
          defaultClassId={classId}
          defaultDayOfWeek={defaultDayOfWeek}
        />
      ) : null}
    </div>
  );
}
