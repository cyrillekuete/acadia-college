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
import { aggregateRoomUsage, formatWeeklyHours } from '@/lib/acadia/resources';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { Skeleton } from '@/components/ui/skeleton';

export function RoomUsagePanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: years = [] } = useAcademicYearOptions();
  const [academicYearId, setAcademicYearId] = useState('');

  const effectiveYearId = academicYearId || years.find((y) => y.isCurrent)?.id || '';

  const query = useQuery({
    queryKey: ['room-usage', tenantId, effectiveYearId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('TimetableSlot')
        .select(
          `
          id,
          roomId,
          dayOfWeek,
          startMinutes,
          endMinutes,
          Room:roomId ( code, nameEn, capacity )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('academicYearId', effectiveYearId);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      !!effectiveYearId &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const rows = useMemo(() => {
    const slots = (query.data ?? []).map((row) => ({
      id: row.id as string,
      roomId: row.roomId as string,
      dayOfWeek: Number(row.dayOfWeek),
      startMinutes: Number(row.startMinutes),
      endMinutes: Number(row.endMinutes),
    }));
    const usageMap = aggregateRoomUsage(slots);
    const roomMeta = new Map<string, { code: string; nameEn: string; capacity: number | null }>();
    for (const row of query.data ?? []) {
      const room = unwrapRelation<{
        code?: string;
        nameEn?: string;
        capacity?: number | null;
      }>(row.Room);
      if (room) {
        roomMeta.set(row.roomId as string, {
          code: room.code ?? '',
          nameEn: room.nameEn ?? '',
          capacity: room.capacity ?? null,
        });
      }
    }
    return [...usageMap.entries()]
      .map(([roomId, stats]) => {
        const meta = roomMeta.get(roomId);
        return {
          roomId,
          label: meta ? `${meta.code} — ${meta.nameEn}` : roomId,
          capacity: meta?.capacity ?? null,
          ...stats,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [query.data]);

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(query.error)}</p>
    );
  }

  return (
    <div className="space-y-4">
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

      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Weekly slots</TableHead>
              <TableHead>Scheduled hours / week</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.roomId}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>{row.capacity ?? '—'}</TableCell>
                <TableCell>{row.slotCount}</TableCell>
                <TableCell>{formatWeeklyHours(row.weeklyMinutes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
