'use client';

import { use } from 'react';
import { AttendanceEntryGrid } from '@/components/acadia/attendance/attendance-entry-grid';
import { AttendanceSessionForm } from '@/components/acadia/attendance/attendance-session-form';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';

const SESSION_SELECT = `
  id,
  academicYearId,
  subjectId,
  sessionDate,
  label,
  timetableSlotId,
  createdAt,
  Subject!AttendanceSession_subjectId_tenantId_fkey ( code, nameEn ),
  AcademicYear!AttendanceSession_academicYearId_tenantId_fkey ( label )
`;

type AttendanceSessionDetail = {
  id: string;
  academicYearId: string;
  subjectId: string;
  sessionDate: string;
  label: string | null;
  timetableSlotId: string | null;
  createdAt: string;
  Subject: unknown;
  AcademicYear: unknown;
};

export default function AttendanceSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const { data, isLoading, isError, error } =
    useSupabaseRecord<AttendanceSessionDetail>(
      'AttendanceSession',
      id,
      SESSION_SELECT,
    );

  const subject = unwrapRelation<{ code?: string; nameEn?: string }>(data?.Subject);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);
  const title = data?.sessionDate
    ? `Attendance — ${data.sessionDate}`
    : 'Attendance session';

  return (
    <RecordDetailShell
      title={title}
      description="Session details and daily attendance marks."
      backHref="/attendance"
      backLabel="Back to attendance"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <Tabs defaultValue="marks" className="space-y-4">
          <TabsList className="print:hidden">
            <TabsTrigger value="marks">Daily marks</TabsTrigger>
            {canManage ? (
              <TabsTrigger value="edit">Edit session</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="marks">
            <RecordDetailCard
              title="Session"
              fields={[
                { label: 'Date', value: data.sessionDate },
                { label: 'Subject', value: subject?.code ?? '—' },
                { label: 'Year', value: year?.label ?? '—' },
                { label: 'Label', value: formatRecordValue(data.label) },
              ]}
            />
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Student attendance</h3>
              <AttendanceEntryGrid
                attendanceSessionId={data.id}
                academicYearId={data.academicYearId}
                subjectId={data.subjectId}
                readOnly={!canManage}
              />
            </div>
          </TabsContent>

          {canManage ? (
            <TabsContent value="edit">
              <AttendanceSessionForm
                record={{
                  id: data.id,
                  academicYearId: data.academicYearId,
                  subjectId: data.subjectId,
                  sessionDate: data.sessionDate,
                  label: data.label ?? '',
                  timetableSlotId: data.timetableSlotId ?? '',
                }}
                onCancelHref={`/attendance/sessions/${data.id}`}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}
    </RecordDetailShell>
  );
}
