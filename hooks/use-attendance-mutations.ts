'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ATTENDANCE_NOTIFICATION_EVENT,
  buildAttendanceRecordRow,
  buildAttendanceSessionRow,
  shouldNotifyGuardian,
} from '@/lib/acadia/attendance';
import type {
  AttendanceEntryContextValues,
  AttendanceSessionFormValues,
} from '@/lib/acadia/attendance-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateAttendanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['attendance-entry'] });
  void queryClient.invalidateQueries({ queryKey: ['attendance-percentages'] });
  void queryClient.invalidateQueries({ queryKey: ['attendance-reports'] });
  void queryClient.invalidateQueries({ queryKey: ['attendance-analytics'] });
  void queryClient.invalidateQueries({ queryKey: ['acadia-notifications'] });
}

type GuardianLinkRow = {
  guardianUserId: string;
  studentProfileId: string;
};

type NotifyContext = {
  sessionDate: string;
  courseCode: string;
  studentName: string;
  status: string;
};

async function notifyGuardiansForRecords(
  supabase: ReturnType<typeof requireBrowserClient>,
  tenantId: string,
  records: AttendanceEntryContextValues['records'],
  contextByStudent: Map<string, NotifyContext>,
): Promise<number> {
  const notifyRecords = records.filter((r) => shouldNotifyGuardian(r.status));
  if (notifyRecords.length === 0) {
    return 0;
  }

  const studentIds = Array.from(
    new Set(notifyRecords.map((r) => r.studentProfileId)),
  );
  const { data: links, error: linkError } = await supabase
    .from('GuardianStudentLink')
    .select('guardianUserId, studentProfileId')
    .eq('tenantId', tenantId)
    .in('studentProfileId', studentIds)
    .is('consentRevokedAt', null);

  if (linkError) {
    console.error('[notifyGuardians]', linkError.message);
    return 0;
  }

  const guardiansByStudent = new Map<string, string[]>();
  for (const link of (links ?? []) as GuardianLinkRow[]) {
    const list = guardiansByStudent.get(link.studentProfileId) ?? [];
    list.push(link.guardianUserId);
    guardiansByStudent.set(link.studentProfileId, list);
  }

  if (guardiansByStudent.size === 0) {
    return 0;
  }

  const guardianIds = Array.from(
    new Set(
      Array.from(guardiansByStudent.values()).flat(),
    ),
  );

  const { data: preferences, error: prefError } = await supabase
    .from('NotificationPreference')
    .select('userId, inApp')
    .eq('tenantId', tenantId)
    .eq('event', ATTENDANCE_NOTIFICATION_EVENT)
    .in('userId', guardianIds);

  if (prefError) {
    console.error('[notifyGuardians] preferences', prefError.message);
  }

  const prefByUser = new Map(
    (preferences ?? []).map((p) => [p.userId as string, p.inApp as boolean]),
  );

  const now = new Date().toISOString();
  const rows: {
    id: string;
    tenantId: string;
    userId: string;
    event: string;
    titleEn: string;
    titleFr: string;
    bodyEn: string;
    bodyFr: string;
    data: Record<string, unknown>;
    createdAt: string;
  }[] = [];

  for (const record of notifyRecords) {
    const guardians = guardiansByStudent.get(record.studentProfileId) ?? [];
    const ctx = contextByStudent.get(record.studentProfileId);
    if (!ctx) {
      continue;
    }

    for (const guardianUserId of guardians) {
      const pref = prefByUser.get(guardianUserId);
      if (pref === false) {
        continue;
      }

      const statusLabel =
        record.status === 'ABSENT' ? 'absent' : 'late';
      rows.push({
        id: generateAcadiaId('notif'),
        tenantId,
        userId: guardianUserId,
        event: ATTENDANCE_NOTIFICATION_EVENT,
        titleEn: `Attendance: ${ctx.studentName}`,
        titleFr: `Présence : ${ctx.studentName}`,
        bodyEn: `${ctx.studentName} was marked ${statusLabel} for ${ctx.courseCode} on ${ctx.sessionDate}.`,
        bodyFr: `${ctx.studentName} a été marqué(e) ${record.status === 'ABSENT' ? 'absent(e)' : 'en retard'} pour ${ctx.courseCode} le ${ctx.sessionDate}.`,
        data: {
          studentProfileId: record.studentProfileId,
          status: record.status,
          sessionDate: ctx.sessionDate,
          courseCode: ctx.courseCode,
        },
        createdAt: now,
      });
    }
  }

  if (rows.length === 0) {
    return 0;
  }

  const { error: insertError } = await supabase.from('Notification').insert(rows);
  if (insertError) {
    console.error('[notifyGuardians] insert', insertError.message);
    return 0;
  }

  return rows.length;
}

export function useAttendanceMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const actorUserId = session?.authUser?.id ?? null;

  const createAttendanceSession = useMutation({
    mutationFn: async (values: AttendanceSessionFormValues) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const id = generateAcadiaId('att');
      const now = new Date().toISOString();
      const row = buildAttendanceSessionRow(
        tenantId,
        id,
        values,
        actorUserId,
        now,
      );

      const { error } = await supabase.from('AttendanceSession').insert({
        ...row,
        createdAt: now,
      });
      if (error) {
        throw error;
      }

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'attendance_session.created',
          entityId: id,
          entityType: 'AttendanceSession',
          description: `Attendance session on ${values.sessionDate}`,
        });
      }

      return id;
    },
    onSuccess: (id) => {
      invalidateAttendanceQueries(queryClient);
      toast.success('Attendance session created.');
      router.push(`/attendance/sessions/${id}`);
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateAttendanceSession = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: AttendanceSessionFormValues;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant context is required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();
      const row = buildAttendanceSessionRow(
        tenantId,
        id,
        values,
        actorUserId,
        now,
      );

      const { error } = await supabase
        .from('AttendanceSession')
        .update(row)
        .eq('id', id);
      if (error) {
        throw error;
      }

      if (actorUserId) {
        await appendSystemLog(supabase, {
          userId: actorUserId,
          event: 'attendance_session.updated',
          entityId: id,
          entityType: 'AttendanceSession',
        });
      }
    },
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient);
      toast.success('Attendance session updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveAttendanceEntry = useMutation({
    mutationFn: async (input: AttendanceEntryContextValues) => {
      if (!tenantId || !actorUserId) {
        throw new Error('Tenant and user context are required.');
      }
      const supabase = requireBrowserClient();
      const now = new Date().toISOString();

      const { data: sessionRow, error: sessionError } = await supabase
        .from('AttendanceSession')
        .select(
          `
          sessionDate,
          Course:courseId ( code )
        `,
        )
        .eq('id', input.attendanceSessionId)
        .single();

      if (sessionError) {
        throw sessionError;
      }

      const course = Array.isArray(sessionRow.Course)
        ? sessionRow.Course[0]
        : sessionRow.Course;
      const courseCode =
        (course as { code?: string } | null)?.code ?? 'course';

      const studentIds = input.records.map((r) => r.studentProfileId);
      const { data: students, error: studentsError } = await supabase
        .from('StudentProfile')
        .select('id, registrationNumber, User:userId ( name )')
        .eq('tenantId', tenantId)
        .in('id', studentIds);

      if (studentsError) {
        throw studentsError;
      }

      const nameByStudent = new Map<string, string>();
      for (const student of students ?? []) {
        const user = Array.isArray(student.User)
          ? student.User[0]
          : student.User;
        const name =
          (user as { name?: string } | null)?.name ??
          (student.registrationNumber as string);
        nameByStudent.set(student.id as string, name);
      }

      for (const record of input.records) {
        const { data: existing, error: fetchError } = await supabase
          .from('AttendanceRecord')
          .select('id')
          .eq('tenantId', tenantId)
          .eq('attendanceSessionId', input.attendanceSessionId)
          .eq('studentProfileId', record.studentProfileId)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        const row = buildAttendanceRecordRow(
          tenantId,
          existing?.id ?? generateAcadiaId('attrec'),
          input.attendanceSessionId,
          record,
          now,
        );

        if (existing?.id) {
          const { error } = await supabase
            .from('AttendanceRecord')
            .update(row)
            .eq('id', existing.id);
          if (error) {
            throw error;
          }
        } else {
          const { error } = await supabase.from('AttendanceRecord').insert({
            ...row,
            createdAt: now,
          });
          if (error) {
            throw error;
          }
        }
      }

      await appendSystemLog(supabase, {
        userId: actorUserId,
        event: 'attendance_record.saved',
        entityId: input.attendanceSessionId,
        entityType: 'AttendanceSession',
        meta: { recordCount: input.records.length },
      });

      let notified = 0;
      if (input.notifyGuardians !== false) {
        const contextByStudent = new Map<string, NotifyContext>();
        for (const record of input.records) {
          contextByStudent.set(record.studentProfileId, {
            sessionDate: sessionRow.sessionDate as string,
            courseCode,
            studentName:
              nameByStudent.get(record.studentProfileId) ?? 'Student',
            status: record.status,
          });
        }
        notified = await notifyGuardiansForRecords(
          supabase,
          tenantId,
          input.records,
          contextByStudent,
        );
      }

      return { notified };
    },
    onSuccess: (result) => {
      invalidateAttendanceQueries(queryClient);
      if (result.notified > 0) {
        toast.success(`Attendance saved. ${result.notified} guardian notification(s) sent.`);
      } else {
        toast.success('Attendance saved.');
      }
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    createAttendanceSession,
    updateAttendanceSession,
    saveAttendanceEntry,
  };
}
