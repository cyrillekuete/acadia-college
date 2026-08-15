import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';

export type SystemLogEvent =
  | 'user.created'
  | 'user.updated'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.blocked'
  | 'user.role_changed'
  | 'user.password_reset'
  | 'account.deleted'
  | 'tenant.session_settings_updated'
  | 'enrollment.application_created'
  | 'enrollment.application_updated'
  | 'enrollment.application_approved'
  | 'enrollment.application_rejected'
  | 'enrollment.password_reset_failed'
  | 'student.created'
  | 'student.credentials_downloaded'
  | 'staff.created'
  | 'student.profile_updated'
  | 'student.class_migrated'
  | 'exam_session.created'
  | 'exam_session.updated'
  | 'exam_session.finalized'
  | 'subject_mark.created'
  | 'subject_mark.updated'
  | 'attendance_session.created'
  | 'attendance_session.updated'
  | 'attendance_record.saved'
  | 'fee_plan.saved'
  | 'fee_account.created'
  | 'fee_payment.recorded'
  | 'finance_ledger.created'
  | 'finance_budget.saved'
  | 'promotion.auto_computed'
  | 'promotion.override_saved'
  | 'promotion.policy_saved'
  | 'promotion.policies_copied'
  | 'academic_year.rollover'
  | 'data_retention.policy_updated'
  | 'data_retention.archive_run'
  | 'message.thread_created'
  | 'message.sent'
  | 'announcement.created'
  | 'announcement.published'
  | 'notification.preference_updated'
  | 'learning_material.uploaded'
  | 'school_resource.created'
  | 'resource.allocation_saved'
  | 'resource.usage_logged'
  | 'resource.request_submitted'
  | 'resource.request_reviewed'
  | 'room.maintenance_scheduled'
  | 'student_term_discipline.saved';

/**
 * Best-effort audit log. Never throws — callers must not fail primary work when logging fails.
 */
export async function appendSystemLog(
  supabase: SupabaseClient,
  input: {
    userId: string;
    event: SystemLogEvent;
    description?: string;
    entityId?: string;
    entityType?: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from('SystemLog').insert({
      id: generateAcadiaId('log'),
      userId: input.userId,
      event: input.event,
      description: input.description ?? null,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    });

    if (error) {
      console.error('[appendSystemLog]', error.message);
    }
  } catch (error) {
    console.error('[appendSystemLog]', error);
  }
}
