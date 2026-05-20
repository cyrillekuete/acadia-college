'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/acadia/record-display';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';

const MARK_EVENTS = ['subject_mark.created', 'subject_mark.updated'] as const;

export function MarksAuditPanel() {
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const query = useQuery({
    queryKey: ['marks-audit', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SystemLog')
        .select('id, event, description, entityId, meta, createdAt, User:userId ( name )')
        .in('event', [...MARK_EVENTS])
        .order('createdAt', { ascending: false })
        .limit(50);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Recent grade changes from the system log (FR-4.1.4).
      </p>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit trail…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Mark</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((row) => (
              <TableRow key={row.id as string}>
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>{row.event as string}</TableCell>
                <TableCell className="font-mono text-xs">
                  {(row.entityId as string) ?? '—'}
                </TableCell>
                <TableCell className="text-xs max-w-md truncate">
                  {row.description ?? row.meta ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
