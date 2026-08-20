import { NextResponse } from 'next/server';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = await createClient();
  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'user.password_changed',
    entityType: 'User',
    entityId: auth.ctx.actorUserId,
    tenantId: auth.ctx.tenantId,
    description: 'User changed their password.',
  });

  return NextResponse.json({ message: 'Password change logged.' });
}
