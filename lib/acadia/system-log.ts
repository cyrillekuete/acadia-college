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
  | 'tenant.session_settings_updated';

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
}
