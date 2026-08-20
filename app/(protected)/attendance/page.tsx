'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AttendancePercentagesPanel } from '@/components/acadia/attendance/attendance-percentages-panel';
import { AttendanceSessionFormDialog } from '@/components/acadia/attendance/attendance-session-form-dialog';
import { ATTENDANCE_TABLE_LAYOUT } from '@/components/acadia/attendance/attendance-table-layout';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  canViewAttendanceAnalytics,
  canViewAttendanceReports,
  canWriteOperations,
} from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

type AttendanceRow = {
  id: string;
  sessionDate?: string;
  label?: string;
  Subject?: unknown;
  Class?: unknown;
} & Record<string, unknown>;

const ATTENDANCE_SELECT = `
  id,
  sessionDate,
  label,
  createdAt,
  Subject!AttendanceSession_subjectId_tenantId_fkey ( code, nameEn ),
  Class!AttendanceSession_classId_tenantId_fkey ( name )
`;

export default function AttendancePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isLoading: sessionLoading } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const canReports = canViewAttendanceReports(session?.roleSlug);
  const canAnalytics = canViewAttendanceAnalytics(session?.roleSlug);
  const [sheetOpen, setSheetOpen] = useState(false);

  const columns = useMemo<ColumnDef<AttendanceRow>[]>(
    () => [
      {
        accessorKey: 'sessionDate',
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" visibility column={column} />
        ),
        cell: ({ row }) => (
          <Link
            href={`/attendance/sessions/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {String(row.original.sessionDate ?? '—')}
          </Link>
        ),
        size: 140,
      },
      {
        id: 'class',
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" visibility column={column} />
        ),
        cell: ({ row }) => {
          const classRow = unwrapRelation<{ name?: string }>(row.original.Class);
          return classRow?.name ?? '—';
        },
        size: 140,
      },
      {
        id: 'subject',
        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" visibility column={column} />
        ),
        cell: ({ row }) => {
          const subject = unwrapRelation<{ code?: string }>(row.original.Subject);
          return subject?.code ?? '—';
        },
        size: 120,
      },
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataGridColumnHeader title="Label" visibility column={column} />
        ),
        size: 180,
      },
    ],
    [],
  );

  useEffect(() => {
    if (searchParams.get('new') !== '1' || sessionLoading) {
      return;
    }
    if (canManage) {
      setSheetOpen(true);
    }
    router.replace('/attendance', { scroll: false });
  }, [searchParams, canManage, sessionLoading, router]);

  return (
    <AcadiaPageShell
      title={t('attendance.title')}
      description={t('attendance.description')}
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {canManage ? (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            {t('attendance.newSession')}
          </Button>
        ) : null}
        {canReports ? (
          <Button size="sm" variant="outline" asChild>
            <Link href="/attendance/reports">{t('attendance.reportsTitle')}</Link>
          </Button>
        ) : null}
        {canAnalytics ? (
          <Button size="sm" variant="outline" asChild>
            <Link href="/attendance/analytics">{t('attendance.analyticsTitle')}</Link>
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="sessions" className="print:hidden">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {canReports ? (
            <TabsTrigger value="rates">Attendance rates</TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="sessions" className="mt-4">
          <SupabaseTableList
            scopeByAcademicYear
            table="AttendanceSession"
            title={t('attendance.sessions')}
            select={ATTENDANCE_SELECT}
            columns={columns}
            searchKeys={['label']}
            tableLayout={ATTENDANCE_TABLE_LAYOUT}
          />
        </TabsContent>
        {canReports ? (
          <TabsContent value="rates" className="mt-4">
            <AttendancePercentagesPanel />
          </TabsContent>
        ) : null}
      </Tabs>

      {canManage ? (
        <AttendanceSessionFormDialog
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      ) : null}
    </AcadiaPageShell>
  );
}
