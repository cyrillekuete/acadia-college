import { NextResponse } from 'next/server';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { mapAcadiaProfileToAccountUser } from '@/lib/api/user-management-supabase';
import { createClient } from '@/lib/supabase/server';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';

export async function GET() {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const supabase = await createClient();
  const profileResult = await fetchAcadiaUserProfile(
    supabase,
    auth.ctx.actorUserId,
  );

  if (profileResult.status !== 'ok') {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  }

  return NextResponse.json(mapAcadiaProfileToAccountUser(profileResult.profile));
}
