'use client';

import { use, useState } from 'react';
import { AttendanceEntryGrid } from '@/components/acadia/attendance/attendance-entry-grid';
import { AttendanceSessionForm } from '@/components/acadia/attendance/attendance-session-form';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useAttendanceMutations } from '@/hooks/use-attendance-mutations';
import { canWriteOperations } from '@/lib/acadia/roles';
import { formatRecordValue, unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

const SESSION_SELECT = `
  id,
  academicYearId,
  classId,
  subjectId,
  sessionDate,
  label,
  timetableSlotId,
  createdAt,
  Subject!AttendanceSession_subjectId_tenantId_fkey ( code, nameEn ),
  Class!AttendanceSession_classId_tenantId_fkey ( name ),
  AcademicYear!AttendanceSession_academicYearId_tenantId_fkey ( label )
`;

type AttendanceSessionDetail = {
  id: string;
  academicYearId: string;
  classId: string | null;
  subjectId: string;
  sessionDate: string;
  label: string | null;
  timetableSlotId: string | null;
  createdAt: string;
  Subject: unknown;
  Class: unknown;
  AcademicYear: unknown;
};

export default function AttendanceSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);
  const { deleteAttendanceSession } = useAttendanceMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data, isLoading, isError, error } =
    useSupabaseRecord<AttendanceSessionDetail>(
      'AttendanceSession',
      id,
      SESSION_SELECT,
    );

  const subject = unwrapRelation<{ code?: string; nameEn?: string }>(data?.Subject);
  const classRow = unwrapRelation<{ name?: string }>(data?.Class);
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
                { label: 'Class', value: classRow?.name ?? '—' },
                { label: 'Subject', value: subject?.code ?? '—' },
                { label: 'Year', value: year?.label ?? '—' },
                { label: 'Label', value: formatRecordValue(data.label) },
              ]}
            />
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-semibold">Student attendance</h3>
              <AttendanceEntryGrid
                attendanceSessionId={data.id}
                academicYearId={data.academicYearId}
                classId={data.classId}
                readOnly={!canManage}
              />
            </div>
          </TabsContent>

          {canManage ? (
            <TabsContent value="edit">
              <div className="space-y-6">
                <AttendanceSessionForm
                  record={{
                    id: data.id,
                    academicYearId: data.academicYearId,
                    classId: data.classId ?? '',
                    subjectId: data.subjectId,
                    sessionDate: data.sessionDate,
                    label: data.label ?? '',
                    timetableSlotId: data.timetableSlotId ?? '',
                  }}
                  onCancelHref={`/attendance/sessions/${data.id}`}
                />
                <div className="rounded-md border border-destructive/40 p-4">
                  <h3 className="mb-2 font-semibold text-destructive">
                    {t('attendance.deleteSession')}
                  </h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t('attendance.deleteSessionDescription')}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteAttendanceSession.isPending}
                    onClick={() => setDeleteOpen(true)}
                  >
                    {t('attendance.deleteSession')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('attendance.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('attendance.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteAttendanceSession.isPending}
              onClick={() => deleteAttendanceSession.mutate(id)}
            >
              {t('attendance.deleteSession')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RecordDetailShell>
  );
}
