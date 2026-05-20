'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import {
  TimetableSlotFormDialog,
  type TimetableSlotRecord,
} from '@/components/acadia/timetable/timetable-slot-form-dialog';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import {
  dayOfWeekLabel,
  formatTimeRange,
} from '@/lib/acadia/timetable';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { canWriteRegistry } from '@/lib/acadia/roles';

type Row = Record<string, unknown> & {
  id: string;
  academicYearId: string;
  subjectId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  Subject?: unknown;
  StaffProfile?: unknown;
  Room?: unknown;
  AcademicYear?: unknown;
};

export default function TimetablePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlotRecord | null>(null);
  const { activeYearId } = useActiveAcademicYear();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const { deleteTimetableSlot } = useSubjectMutations();

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
        id: 'subject',
        header: 'Subject',
        cell: ({ row }) => {
          const subject = unwrapRelation<{ code?: string; nameEn?: string }>(
            row.original.Subject,
          );
          if (!subject?.code) {
            return '—';
          }
          return `${subject.code} — ${subject.nameEn ?? ''}`.trim();
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
                        subjectId: row.original.subjectId,
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
      description="Weekly timetable slots by subject, teacher, and room."
    >
      <AdminToolbar
        addLabel="New slot"
        onAdd={() => {
          setEditingSlot(null);
          setDialogOpen(true);
        }}
      />
      <div className="mb-4">
        <CurrentAcademicYearBadge />
      </div>
      <SupabaseTableList
        scopeByAcademicYear
        table="TimetableSlot"
        title="Timetable slots"
        select="id, academicYearId, subjectId, staffProfileId, roomId, dayOfWeek, startMinutes, endMinutes, Subject!TimetableSlot_subjectId_tenantId_fkey ( code, nameEn ), StaffProfile!TimetableSlot_staffProfileId_tenantId_fkey ( staffCode, User!StaffProfile_userId_tenantId_fkey ( name ) ), Room!TimetableSlot_roomId_tenantId_fkey ( code, nameEn ), AcademicYear!TimetableSlot_academicYearId_tenantId_fkey ( label )"
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
