'use client';

import { useMemo } from 'react';
import { Plus, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeRange } from '@/lib/acadia/timetable';
import {
  groupGridSlotsByDay,
  timetableGridDayLabel,
  TIMETABLE_GRID_DAYS,
  type TimetableGridSlot,
} from '@/lib/acadia/timetable-grid';
import { cn } from '@/lib/utils';

type TimetableGridDisplay = {
  showClassName?: boolean;
  showTeacherName?: boolean;
};

type WeeklyTimetableGridProps = {
  slots: TimetableGridSlot[];
  isLoading?: boolean;
  days?: readonly number[];
  canManage?: boolean;
  display?: TimetableGridDisplay;
  onEditSlot?: (slot: TimetableGridSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
  onAddSlot?: (dayOfWeek: number) => void;
  emptyMessage?: string;
};

function TimetableSlotCard({
  slot,
  canManage,
  showClassName = false,
  showTeacherName = true,
  onEdit,
  onDelete,
}: {
  slot: TimetableGridSlot;
  canManage?: boolean;
  showClassName?: boolean;
  showTeacherName?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const subjectLabel =
    slot.subjectCode && slot.subjectName
      ? `${slot.subjectCode} — ${slot.subjectName}`
      : slot.subjectCode ?? slot.subjectName ?? 'Subject';

  return (
    <button
      type="button"
      className={cn(
        'group relative w-full rounded-md border bg-card p-3 text-left text-sm shadow-xs transition-colors print:break-inside-avoid print:shadow-none',
        canManage && onEdit && 'cursor-pointer hover:border-primary/40 hover:bg-muted/40',
        !canManage && 'cursor-default',
      )}
      onClick={canManage && onEdit ? onEdit : undefined}
    >
      <p className="font-medium leading-snug">{subjectLabel}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatTimeRange(slot.startMinutes, slot.endMinutes)}
      </p>
      {showClassName && slot.className ? (
        <p className="mt-1 text-xs text-muted-foreground">{slot.className}</p>
      ) : null}
      {showTeacherName && slot.teacherName ? (
        <p className="mt-1 text-xs text-muted-foreground">{slot.teacherName}</p>
      ) : null}
      {slot.roomCode ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{slot.roomCode}</p>
      ) : null}
      {canManage && onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Delete slot"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      ) : null}
    </button>
  );
}

function DayColumn({
  day,
  slots,
  canManage,
  showClassName,
  showTeacherName,
  onEditSlot,
  onDeleteSlot,
  onAddSlot,
}: {
  day: number;
  slots: TimetableGridSlot[];
  canManage?: boolean;
  showClassName?: boolean;
  showTeacherName?: boolean;
  onEditSlot?: (slot: TimetableGridSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
  onAddSlot?: (dayOfWeek: number) => void;
}) {
  return (
    <div className="flex min-h-48 flex-col gap-2">
      <div className="space-y-2">
        {slots.map((slot) => (
          <TimetableSlotCard
            key={slot.id}
            slot={slot}
            canManage={canManage}
            showClassName={showClassName}
            showTeacherName={showTeacherName}
            onEdit={onEditSlot ? () => onEditSlot(slot) : undefined}
            onDelete={onDeleteSlot ? () => onDeleteSlot(slot.id) : undefined}
          />
        ))}
      </div>
      {slots.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          No slots
        </p>
      ) : null}
      {canManage && onAddSlot ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          onClick={() => onAddSlot(day)}
        >
          <Plus className="size-4" />
          Add slot
        </Button>
      ) : null}
    </div>
  );
}

export function WeeklyTimetableGrid({
  slots,
  isLoading = false,
  days = TIMETABLE_GRID_DAYS,
  canManage = false,
  display,
  onEditSlot,
  onDeleteSlot,
  onAddSlot,
  emptyMessage = 'No timetable slots for this class yet.',
}: WeeklyTimetableGridProps) {
  const showClassName = display?.showClassName ?? false;
  const showTeacherName = display?.showTeacherName ?? true;
  const slotsByDay = useMemo(
    () => groupGridSlotsByDay(slots, days),
    [slots, days],
  );

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (slots.length === 0 && !canManage) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="hidden overflow-x-auto md:block print:block print:overflow-visible">
        <div
          className="grid min-w-[720px] gap-3 print:min-w-0 print:w-full"
          style={{
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          {days.map((day) => (
            <div key={day} className="min-w-0">
              <p className="mb-2 text-center text-sm font-medium">
                {timetableGridDayLabel(day)}
              </p>
              <DayColumn
                day={day}
                slots={slotsByDay.get(day) ?? []}
                canManage={canManage}
                showClassName={showClassName}
                showTeacherName={showTeacherName}
                onEditSlot={onEditSlot}
                onDeleteSlot={onDeleteSlot}
                onAddSlot={onAddSlot}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 md:hidden print:hidden">
        {days.map((day) => (
          <Card key={day}>
            <CardContent className="pt-4">
              <p className="mb-3 text-sm font-medium">{timetableGridDayLabel(day)}</p>
              <DayColumn
                day={day}
                slots={slotsByDay.get(day) ?? []}
                canManage={canManage}
                showClassName={showClassName}
                showTeacherName={showTeacherName}
                onEditSlot={onEditSlot}
                onDeleteSlot={onDeleteSlot}
                onAddSlot={onAddSlot}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
