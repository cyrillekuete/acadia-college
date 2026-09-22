import { NextResponse } from 'next/server';
import {
  finalizeProfileDeletion,
  softDeleteStudentProfile,
} from '@/lib/acadia/profile-deletion';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { resolveStudentProfileId } from '@/lib/supabase/queries/student-query-helpers';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireRegistryApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'User provisioning is not configured on this server.' },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: 'Student id is required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const profileId = await resolveStudentProfileId(admin, auth.ctx.tenantId, id.trim());
  if (!profileId) {
    return NextResponse.json({ message: 'Student profile not found.' }, { status: 404 });
  }

  const result = await softDeleteStudentProfile(admin, {
    tenantId: auth.ctx.tenantId,
    profileId,
    actorUserId: auth.ctx.actorUserId,
  });
  const response = await finalizeProfileDeletion(admin, result);
  return NextResponse.json(response.body, { status: response.status });
}
