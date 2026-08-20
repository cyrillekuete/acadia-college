import type { SupabaseClient } from '@supabase/supabase-js';
import { shouldDeliverInAppNotification } from '@/lib/acadia/communication';
import { generateAcadiaId } from '@/lib/acadia/ids';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const MARKS_PUBLISHED_EVENT = 'marks.published' as const;

/**
 * Notify students (and their guardians) that marks for an exam session were published.
 */
export async function notifyMarksPublished(
  supabase: Client,
  input: {
    tenantId: string;
    examSessionId: string;
    academicYearId: string;
    subjectId: string;
  },
): Promise<number> {
  const { data: marks, error: marksError } = await supabase
    .from('SubjectMark')
    .select('studentProfileId')
    .eq('tenantId', input.tenantId)
    .eq('examSessionId', input.examSessionId)
    .eq('subjectId', input.subjectId);

  if (marksError) {
    throw marksError;
  }

  const studentProfileIds = Array.from(
    new Set((marks ?? []).map((row) => row.studentProfileId as string)),
  );
  if (studentProfileIds.length === 0) {
    return 0;
  }

  const { data: subject } = await supabase
    .from('Subject')
    .select('code, nameEn')
    .eq('id', input.subjectId)
    .maybeSingle();
  const subjectLabel =
    subject?.nameEn?.trim() || subject?.code?.trim() || 'Subject';

  const { data: profiles, error: profileError } = await supabase
    .from('StudentProfile')
    .select('id, userId')
    .eq('tenantId', input.tenantId)
    .in('id', studentProfileIds);
  if (profileError) {
    throw profileError;
  }

  const studentUserIds = (profiles ?? [])
    .map((row) => row.userId as string | null)
    .filter((id): id is string => !!id);

  const { data: links, error: linkError } = await supabase
    .from('GuardianStudentLink')
    .select('guardianUserId, studentProfileId')
    .eq('tenantId', input.tenantId)
    .in('studentProfileId', studentProfileIds);
  if (linkError) {
    throw linkError;
  }

  const recipientIds = Array.from(
    new Set([
      ...studentUserIds,
      ...(links ?? []).map((row) => row.guardianUserId as string),
    ]),
  );
  if (recipientIds.length === 0) {
    return 0;
  }

  const { data: preferences, error: prefError } = await supabase
    .from('NotificationPreference')
    .select('userId, inApp, event')
    .eq('tenantId', input.tenantId)
    .eq('event', MARKS_PUBLISHED_EVENT)
    .in('userId', recipientIds);
  if (prefError) {
    throw prefError;
  }

  const prefByUser = new Map(
    (preferences ?? []).map((row) => [
      row.userId as string,
      { inApp: row.inApp !== false },
    ]),
  );

  const now = new Date().toISOString();
  const rows = recipientIds.flatMap((userId) => {
    if (!shouldDeliverInAppNotification(prefByUser, userId, MARKS_PUBLISHED_EVENT)) {
      return [];
    }
    return [
      {
        id: generateAcadiaId('notif'),
        tenantId: input.tenantId,
        userId,
        event: MARKS_PUBLISHED_EVENT,
        titleEn: `Marks published: ${subjectLabel}`,
        titleFr: `Notes publiées : ${subjectLabel}`,
        bodyEn: `New marks are available for ${subjectLabel}.`,
        bodyFr: `De nouvelles notes sont disponibles pour ${subjectLabel}.`,
        data: {
          examSessionId: input.examSessionId,
          subjectId: input.subjectId,
          academicYearId: input.academicYearId,
        },
        createdAt: now,
      },
    ];
  });

  if (rows.length === 0) {
    return 0;
  }

  const { error: insertError } = await supabase.from('Notification').insert(rows);
  if (insertError) {
    throw insertError;
  }
  return rows.length;
}
