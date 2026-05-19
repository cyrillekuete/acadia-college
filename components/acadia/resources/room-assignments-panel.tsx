'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { formatTimetableSlotSummary } from '@/lib/acadia/resources';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import { useRoomOptions } from '@/hooks/use-course-catalog-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function RoomAssignmentsPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const { data: rooms = [] } = useRoomOptions();
  const [academicYearId, setAcademicYearId] = useState('');
  const [roomId, setRoomId] = useState('');

  const effectiveYearId = academicYearId || years.find((y) => y.isCurrent)?.id || '';

  const query = useQuery({
    queryKey: ['room-assignments', tenantId, effectiveYearId, roomId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      let q = supabase
        .from('TimetableSlot')
        .select(
          `
          id,
          dayOfWeek,
          startMinutes,
          endMinutes,
          roomId,
          Course:courseId ( code, nameEn ),
          StaffProfile:staffProfileId ( User:userId ( name ) ),
          Room:roomId ( code, nameEn )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', effectiveYearId)
        .order('dayOfWeek')
        .order('startMinutes');
      if (roomId) {
        q = q.eq('roomId', roomId);
      }
      const { data, error } = await q;
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      !!effectiveYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const groupedByRoom = useMemo(() => {
    const map = new Map<string, { roomLabel: string; slots: string[] }>();
    for (const row of query.data ?? []) {
      const room = unwrapRelation<{ id?: string; code?: string; nameEn?: string }>(
        row.Room,
      );
      const course = unwrapRelation<{ code?: string; nameEn?: string }>(row.Course);
      const staff = unwrapRelation<{ User?: unknown }>(row.StaffProfile);
      const user = unwrapRelation<{ name?: string }>(staff?.User);
      const key = String(row.roomId);
      const roomLabel = room
        ? `${room.code} — ${room.nameEn}`
        : key;
      const entry = map.get(key) ?? { roomLabel, slots: [] };
      entry.slots.push(
        formatTimetableSlotSummary({
          id: row.id as string,
          dayOfWeek: Number(row.dayOfWeek),
          startMinutes: Number(row.startMinutes),
          endMinutes: Number(row.endMinutes),
          courseCode: course?.code,
          courseName: course?.nameEn,
          staffName: user?.name,
        }),
      );
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) =>
      a.roomLabel.localeCompare(b.roomLabel),
    );
  }, [query.data]);

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={effectiveYearId || '__none__'}
          onValueChange={(v) => setAcademicYearId(v === '__none__' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Academic year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={roomId || '__all__'}
          onValueChange={(v) => setRoomId(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.code} — {room.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Weekly assignments (timetable)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedByRoom.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  No timetable slots for this filter.
                </TableCell>
              </TableRow>
            ) : (
              groupedByRoom.map((group) => (
                <TableRow key={group.roomLabel}>
                  <TableCell className="font-medium align-top">
                    {group.roomLabel}
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                      {group.slots.map((slot) => (
                        <li key={slot}>{slot}</li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
