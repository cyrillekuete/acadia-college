import { NextResponse } from 'next/server';
import { UserStatus } from '@/app/models/user';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import {
  checkMatriculeAvailable,
  checkRegistryStudentEmail,
} from '@/lib/acadia/registry-lookups';
import {
  studentProfileUpdateApiSchema,
} from '@/lib/acadia/student-schemas';
import { withdrawStudentFromYear } from '@/lib/acadia/student-withdraw';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRegistryApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { id: profileId } = await context.params;
  if (!profileId?.trim()) {
    return NextResponse.json({ message: 'Student id is required.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = studentProfileUpdateApiSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { message: first?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: profile, error: profileLookupError } = await supabase
    .from('StudentProfile')
    .select('id, userId, isActive, matriculeNumber')
    .eq('id', profileId.trim())
    .eq('tenantId', auth.ctx.tenantId)
    .maybeSingle();

  if (profileLookupError) {
    return NextResponse.json({ message: profileLookupError.message }, { status: 400 });
  }
  if (!profile?.userId) {
    return NextResponse.json({ message: 'Student not found.' }, { status: 404 });
  }

  const values = parsed.data;
  const nextEmail = values.email.trim().toLowerCase();
  const nextMatricule = values.matriculeNumber ?? null;

  if (nextMatricule) {
    const matriculeCheck = await checkMatriculeAvailable(
      supabase,
      auth.ctx.tenantId,
      nextMatricule,
      profileId.trim(),
    );
    if (!matriculeCheck.ok) {
      return NextResponse.json({ message: matriculeCheck.message }, { status: 400 });
    }
  }

  const { data: currentUser, error: userLookupError } = await supabase
    .from('User')
    .select('email, status')
    .eq('id', profile.userId)
    .eq('tenantId', auth.ctx.tenantId)
    .maybeSingle();
  if (userLookupError) {
    return NextResponse.json({ message: userLookupError.message }, { status: 400 });
  }

  const previousEmail = (currentUser?.email ?? '').trim().toLowerCase();
  if (nextEmail !== previousEmail) {
    const emailCheck = await checkRegistryStudentEmail(
      supabase,
      auth.ctx.tenantId,
      nextEmail,
      profile.userId,
    );
    if (!emailCheck.ok) {
      return NextResponse.json({ message: emailCheck.message }, { status: 400 });
    }
    if (!isAdminClientConfigured()) {
      return NextResponse.json(
        { message: 'User provisioning is not configured on this server.' },
        { status: 503 },
      );
    }
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(profile.userId, {
      email: nextEmail,
      email_confirm: true,
    });
    if (authError) {
      return NextResponse.json(
        {
          message:
            authError.message.includes('already') || authError.status === 422
              ? 'A user with this email already exists.'
              : authError.message,
        },
        { status: 400 },
      );
    }
  }

  const now = new Date().toISOString();
  const nextUserStatus = values.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;

  const { error: profileError } = await supabase
    .from('StudentProfile')
    .update({
      matriculeNumber: nextMatricule,
      isActive: values.isActive,
      alumniDirectoryOptIn: values.alumniDirectoryOptIn,
      alumniSince: values.alumniSince?.trim() || null,
      updatedAt: now,
    })
    .eq('id', profileId.trim())
    .eq('tenantId', auth.ctx.tenantId);
  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 400 });
  }

  const { error: userError } = await supabase
    .from('User')
    .update({
      name: values.name.trim(),
      email: nextEmail,
      country: values.country?.trim() || null,
      timezone: values.timezone?.trim() || null,
      status: nextUserStatus,
      updatedAt: now,
    })
    .eq('id', profile.userId)
    .eq('tenantId', auth.ctx.tenantId);
  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 400 });
  }

  await supabase
    .from('students')
    .update({ email: nextEmail, updated_at: now })
    .eq('id', profile.userId);

  if (profile.isActive && !values.isActive && values.academicYearId) {
    await withdrawStudentFromYear(supabase, {
      tenantId: auth.ctx.tenantId,
      profileId: profileId.trim(),
      academicYearId: values.academicYearId,
      actorUserId: auth.ctx.actorUserId,
      deactivateProfile: false,
    });
  }

  void appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'student.profile_updated',
    description: `Updated student profile ${profileId.trim()}`,
    entityId: profileId.trim(),
    entityType: 'StudentProfile',
    meta: {
      emailChanged: nextEmail !== previousEmail,
      deactivated: profile.isActive && !values.isActive,
    },
  });

  return NextResponse.json({ ok: true });
}
