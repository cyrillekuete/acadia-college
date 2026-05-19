'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AttendancePercentagesPanel } from '@/components/acadia/attendance/attendance-percentages-panel';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';

type AttendanceRow = {
  id: string;
  sessionDate?: string;
  label?: string;
  Course?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<AttendanceRow>[] = [
  {
    accessorKey: 'sessionDate',
    header: 'Date',
    cell: ({ row }) => (
      <Link
        href={`/attendance/sessions/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {String(row.original.sessionDate ?? '—')}
      </Link>
    ),
  },
  nestedFieldColumn<AttendanceRow>('course', 'Course', 'Course', 'code'),
  { accessorKey: 'label', header: 'Label' },
];

const ATTENDANCE_SELECT = `
  id,
  sessionDate,
  label,
  createdAt,
  Course:courseId ( code, nameEn )
`;

export default function AttendancePage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Attendance"
      description="Daily attendance sessions, rates, and guardian notifications."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {canManage ? (
          <Button size="sm" asChild>
            <Link href="/attendance/sessions/new">New session</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href="/attendance/reports">Reports</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/attendance/analytics">Analytics</Link>
        </Button>
      </div>

      <Tabs defaultValue="sessions" className="print:hidden">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="rates">Attendance rates</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="mt-4">
          <SupabaseTableList
            table="AttendanceSession"
            title="Attendance sessions"
            select={ATTENDANCE_SELECT}
            columns={columns}
            searchKeys={['label']}
          />
        </TabsContent>
        <TabsContent value="rates" className="mt-4">
          <AttendancePercentagesPanel />
        </TabsContent>
      </Tabs>
    </AcadiaPageShell>
  );
}
