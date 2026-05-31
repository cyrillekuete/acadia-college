import { NextResponse } from 'next/server';
import type { AcadiaUserProfile } from '@/lib/supabase/queries/user';
import { User, UserStatus } from '@/app/models/user';

const DEPRECATED_MESSAGE =
  'This Metronic user-management API is deprecated. Use Acadia Supabase routes under /api/acadia instead.';

export function deprecatedUserManagementResponse(): NextResponse {
  return NextResponse.json({ message: DEPRECATED_MESSAGE }, { status: 410 });
}

export function deprecatedUserManagementHandler(): NextResponse {
  return deprecatedUserManagementResponse();
}

function parseProfileTimestamp(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(0);
}

/** Maps an Acadia Supabase profile to the legacy account User shape used by user-management UI. */
export function mapAcadiaProfileToAccountUser(profile: AcadiaUserProfile): User {
  const role = profile.UserRole;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    roleId: profile.roleId,
    status: (profile.status as UserStatus) ?? UserStatus.ACTIVE,
    createdAt: parseProfileTimestamp(profile.createdAt),
    updatedAt: parseProfileTimestamp(profile.updatedAt),
    isTrashed: profile.isTrashed,
    isProtected: Boolean(profile.isProtected),
    avatar: null,
    role: {
      id: role?.id ?? profile.roleId,
      slug: role?.slug ?? 'user',
      name: role?.name ?? 'User',
      isTrashed: Boolean(role?.isTrashed),
      isProtected: Boolean(role?.isProtected),
      isDefault: Boolean(role?.isDefault),
      createdAt: parseProfileTimestamp(role?.createdAt),
    },
  };
}
