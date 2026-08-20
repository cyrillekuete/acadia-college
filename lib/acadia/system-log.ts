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
  | 'user.password_changed'
  | 'user.email_changed'
  | 'account.deleted'
  | 'tenant.session_settings_updated'
  | 'tenant.profile_updated'
  | 'enrollment.password_reset_failed'
  | 'student.created'
  | 'student.credentials_downloaded'
  | 'student.withdrawn'
  | 'staff.created'
  | 'staff.updated'
  | 'staff.deactivated'
  | 'student.profile_updated'
  | 'student.class_migrated'
  | 'exam_session.created'
  | 'exam_session.updated'
  | 'exam_session.finalized'
  | 'exam_session.deleted'
  | 'subject_mark.created'
  | 'subject_mark.updated'
  | 'attendance_session.created'
  | 'attendance_session.updated'
  | 'attendance_record.saved'
  | 'fee_plan.saved'
  | 'fee_plan.deleted'
  | 'fee_account.created'
  | 'fee_account.rebilled'
  | 'fee_accounts.provisioned'
  | 'fee_payment.recorded'
  | 'finance_sale.created'
  | 'finance_sale.updated'
  | 'finance_sale.deleted'
  | 'finance_sale.cancelled'
  | 'expenditure.created'
  | 'expenditure.updated'
  | 'expenditure.deleted'
  | 'expenditure.approved'
  | 'expenditure.paid'
  | 'expenditure.rejected'
  | 'expenditure.reopened'
  | 'finance_ledger.created'
  | 'finance_ledger.updated'
  | 'finance_ledger.deleted'
  | 'finance_budget.saved'
  | 'finance_budget.deleted'
  | 'scholarship_type.saved'
  | 'scholarship_type.deleted'
  | 'scholarship.granted'
  | 'scholarship.revoked'
  | 'promotion.auto_computed'
  | 'promotion.override_saved'
  | 'promotion.policy_saved'
  | 'promotion.policies_copied'
  | 'academic_year.rollover'
  | 'data_retention.policy_updated'
  | 'data_retention.archive_run'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'message.thread_created'
  | 'message.sent'
  | 'announcement.created'
  | 'announcement.published'
  | 'alert.created'
  | 'alert.sent'
  | 'alert.group_saved'
  | 'notification.preference_updated'
  | 'learning_material.uploaded'
  | 'school_resource.created'
  | 'resource.allocation_saved'
  | 'resource.usage_logged'
  | 'resource.request_submitted'
  | 'resource.request_reviewed'
  | 'room.maintenance_scheduled'
  | 'student_term_discipline.saved'
  | 'report_card_template.saved'
  | 'transcript.copy_request_submitted'
  | 'transcript.copy_request_reviewed';

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
    tenantId?: string;
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
      tenantId: input.tenantId ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    });

    if (error) {
      console.error('[appendSystemLog]', error.message);
    }
  } catch (error) {
    console.error('[appendSystemLog]', error);
  }
}
