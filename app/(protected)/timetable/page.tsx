'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  TimetableSlotFormDialog,
  type TimetableSlotRecord,
} from '@/components/acadia/timetable/timetable-slot-form-dialog';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useCourseMutations } from '@/hooks/use-course-mutations';
import {
  dayOfWeekLabel,
  formatTimeRange,
} from '@/lib/acadia/timetable';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { canWriteRegistry } from '@/lib/acadia/roles';

type Row = Record<string, unknown> & {
  id: string;
  academicYearId: string;
  courseId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  Course?: unknown;
  StaffProfile?: unknown;
  Room?: unknown;
  AcademicYear?: unknown;
};

export default function TimetablePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlotRecord | null>(null);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { deleteTimetableSlot } = useCourseMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'day',
        header: 'Day',
        cell: ({ row }) => dayOfWeekLabel(row.original.dayOfWeek),
      },
      {
        id: 'time',
        header: 'Time',
        cell: ({ row }) =>
          formatTimeRange(row.original.startMinutes, row.original.endMinutes),
      },
      {
        id: 'course',
        header: 'Course',
        cell: ({ row }) => {
          const course = unwrapRelation<{ code?: string; nameEn?: string }>(
            row.original.Course,
          );
          if (!course?.code) {
            return '—';
          }
          return `${course.code} — ${course.nameEn ?? ''}`.trim();
        },
      },
      {
        id: 'teacher',
        header: 'Teacher',
        cell: ({ row }) => {
          const staff = unwrapRelation<{
            staffCode?: string;
            User?: unknown;
          }>(row.original.StaffProfile);
          const user = unwrapRelation<{ name?: string }>(staff?.User);
          return formatRecordValue(user?.name ?? staff?.staffCode);
        },
      },
      {
        id: 'room',
        header: 'Room',
        cell: ({ row }) => {
          const room = unwrapRelation<{ code?: string; nameEn?: string }>(
            row.original.Room,
          );
          return formatRecordValue(room?.code ?? room?.nameEn);
        },
      },
      {
        id: 'year',
        header: 'Year',
        cell: ({ row }) =>
          formatRecordValue(
            unwrapRelation<{ label?: string }>(row.original.AcademicYear)?.label,
          ),
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: Row } }) => (
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Edit slot"
                    onClick={() => {
                      setEditingSlot({
                        id: row.original.id,
                        academicYearId: row.original.academicYearId,
                        courseId: row.original.courseId,
                        staffProfileId: row.original.staffProfileId,
                        roomId: row.original.roomId,
                        dayOfWeek: row.original.dayOfWeek,
                        startMinutes: row.original.startMinutes,
                        endMinutes: row.original.endMinutes,
                      });
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete slot"
                    disabled={deleteTimetableSlot.isPending}
                    onClick={() => deleteTimetableSlot.mutate(row.original.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<Row>,
          ]
        : []),
    ],
    [canManage, deleteTimetableSlot],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Timetable"
      description="Weekly timetable slots by course, teacher, and room."
    >
      <AdminToolbar
        addLabel="New slot"
        onAdd={() => {
          setEditingSlot(null);
          setDialogOpen(true);
        }}
      />
      <SupabaseTableList
        table="TimetableSlot"
        title="Timetable slots"
        select="id, academicYearId, courseId, staffProfileId, roomId, dayOfWeek, startMinutes, endMinutes, Course:courseId ( code, nameEn ), StaffProfile:staffProfileId ( staffCode, User:userId ( name ) ), Room:roomId ( code, nameEn ), AcademicYear:academicYearId ( label )"
        columns={columns}
        searchKeys={[]}
      />
      {canManage ? (
        <TimetableSlotFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingSlot(null);
            }
          }}
          record={editingSlot}
        />
      ) : null}
    </AcadiaPageShell>
  );
}
