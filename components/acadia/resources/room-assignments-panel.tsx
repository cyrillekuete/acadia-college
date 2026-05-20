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
import { formatTimetableSlotSummary } from '@/lib/acadia/resources';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoomOptions } from '@/hooks/use-subject-catalog-options';
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
  const { activeYearId } = useActiveAcademicYear();
  const { data: rooms = [] } = useRoomOptions();
  const [roomId, setRoomId] = useState('');

  const query = useQuery({
    queryKey: ['room-assignments', tenantId, activeYearId, roomId],
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
          Subject!TimetableSlot_subjectId_tenantId_fkey ( code, nameEn ),
          StaffProfile!TimetableSlot_staffProfileId_tenantId_fkey ( User!StaffProfile_userId_tenantId_fkey ( name ) ),
          Room!TimetableSlot_roomId_tenantId_fkey ( code, nameEn )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', activeYearId!)
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
      !!activeYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const groupedByRoom = useMemo(() => {
    const map = new Map<string, { roomLabel: string; slots: string[] }>();
    for (const row of query.data ?? []) {
      const room = unwrapRelation<{ id?: string; code?: string; nameEn?: string }>(
        row.Room,
      );
      const subject = unwrapRelation<{ code?: string; nameEn?: string }>(row.Subject);
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
          subjectCode: subject?.code,
          subjectName: subject?.nameEn,
          staffName: user?.name,
        }),
      );
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) =>
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
        <CurrentAcademicYearBadge />
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
