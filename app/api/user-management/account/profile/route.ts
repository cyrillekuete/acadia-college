import { NextRequest, NextResponse } from 'next/server';
import { requireSessionApi } from '@/lib/acadia/require-session-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { mapAcadiaProfileToAccountUser } from '@/lib/api/user-management-supabase';
import { TENANT_ASSETS_BUCKET } from '@/lib/supabase/storage';
import { createClient } from '@/lib/supabase/server';
import { fetchAcadiaUserProfile } from '@/lib/supabase/queries/user';
import { AccountProfileSchema } from '@/app/(protected)/user-management/account/forms/account-profile-schema';

function extensionForAvatar(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
  };
  return map[file.type] ?? 'png';
}

export async function POST(request: NextRequest) {
  const auth = await requireSessionApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const formData = await request.formData();
  const parsedData = {
    name: formData.get('name'),
    avatarFile: formData.get('avatarFile'),
    avatarAction: formData.get('avatarAction'),
  };

  const validationResult = AccountProfileSchema.safeParse(parsedData);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const { name, avatarFile, avatarAction } = validationResult.data;
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let avatarUrl: string | null | undefined;

  if (
    avatarAction === 'save' &&
    avatarFile instanceof File &&
    avatarFile.size > 0
  ) {
    const ext = extensionForAvatar(avatarFile);
    const storageKey = `${auth.ctx.tenantId}/users/${auth.ctx.actorUserId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(TENANT_ASSETS_BUCKET)
      .upload(storageKey, avatarFile, {
        upsert: true,
        contentType: avatarFile.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: 'Failed to upload avatar.' },
        { status: 500 },
      );
    }

    avatarUrl = storageKey;
  } else if (avatarAction === 'remove') {
    const { data: existingUser } = await supabase
      .from('User')
      .select('avatar')
      .eq('id', auth.ctx.actorUserId)
      .eq('tenantId', auth.ctx.tenantId)
      .maybeSingle();

    const existingAvatar =
      (existingUser?.avatar as string | null | undefined) ??
      null;

    if (existingAvatar) {
      await supabase.storage.from(TENANT_ASSETS_BUCKET).remove([existingAvatar]);
    }

    avatarUrl = null;
  }

  const userUpdate: Record<string, unknown> = {
    name,
    updatedAt: nowIso,
  };
  if (avatarUrl !== undefined) {
    userUpdate.avatar = avatarUrl;
  }

  const { error: legacyUpdateError } = await supabase
    .from('User')
    .update(userUpdate)
    .eq('id', auth.ctx.actorUserId)
    .eq('tenantId', auth.ctx.tenantId);

  if (legacyUpdateError) {
    return NextResponse.json(
      { message: 'Unable to update profile.' },
      { status: 500 },
    );
  }

  if (avatarUrl !== undefined) {
    const { error: usersUpdateError } = await supabase
      .from('users')
      .update({
        name,
        avatar_url: avatarUrl,
        updated_at: nowIso,
      })
      .eq('id', auth.ctx.actorUserId)
      .eq('tenant_id', auth.ctx.tenantId);

    if (usersUpdateError) {
      return NextResponse.json(
        { message: 'Unable to update profile.' },
        { status: 500 },
      );
    }
  } else {
    const { error: usersUpdateError } = await supabase
      .from('users')
      .update({ name, updated_at: nowIso })
      .eq('id', auth.ctx.actorUserId)
      .eq('tenant_id', auth.ctx.tenantId);

    if (usersUpdateError) {
      return NextResponse.json(
        { message: 'Unable to update profile.' },
        { status: 500 },
      );
    }
  }

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'user.updated',
    entityType: 'User',
    entityId: auth.ctx.actorUserId,
    description: 'User account profile updated.',
  });

  const profileResult = await fetchAcadiaUserProfile(
    supabase,
    auth.ctx.actorUserId,
  );

  if (profileResult.status !== 'ok') {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  }

  const accountUser = mapAcadiaProfileToAccountUser(profileResult.profile);
  if (avatarUrl !== undefined) {
    accountUser.avatar = avatarUrl;
  }

  return NextResponse.json(accountUser);
}
