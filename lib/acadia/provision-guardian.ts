/**
 * Ensures a PascalCase parent/guardian User and GuardianStudentLink so
 * announcements, attendance, and WhatsApp targeting can resolve recipients.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { UserStatus } from '@/app/models/user';
import { generateAcadiaId } from '@/lib/acadia/ids';

export const GUARDIAN_ROLE_SLUGS = ['parent', 'guardian'] as const;

export type GuardianRoleRow = {
  id: string;
  slug: string;
};

export function pickGuardianRoleId(
  roles: readonly GuardianRoleRow[],
): string | null {
  const bySlug = new Map(
    roles.map((row) => [row.slug.trim().toLowerCase(), row.id]),
  );
  for (const slug of GUARDIAN_ROLE_SLUGS) {
    const id = bySlug.get(slug);
    if (id) {
      return id;
    }
  }
  return null;
}

export type GuardianUserInsert = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  tenantId: string;
  status: typeof UserStatus.ACTIVE;
  invitedByUserId: string;
  emailVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
  isTrashed: false;
  isProtected: false;
};

export function buildGuardianUserInsert(input: {
  parentAuthId: string;
  email: string;
  name: string;
  roleId: string;
  tenantId: string;
  actorUserId: string;
  now: string;
}): GuardianUserInsert {
  return {
    id: input.parentAuthId,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    roleId: input.roleId,
    tenantId: input.tenantId,
    status: UserStatus.ACTIVE,
    invitedByUserId: input.actorUserId,
    emailVerifiedAt: input.now,
    createdAt: input.now,
    updatedAt: input.now,
    isTrashed: false,
    isProtected: false,
  };
}

export type GuardianStudentLinkInsert = {
  id: string;
  tenantId: string;
  guardianUserId: string;
  studentProfileId: string;
  relationshipLabel: string | null;
  consentGrantedAt: string;
  createdAt: string;
  updatedAt: string;
};

export function buildGuardianStudentLinkInsert(input: {
  tenantId: string;
  parentAuthId: string;
  studentProfileId: string;
  relationshipLabel?: string | null;
  now: string;
}): GuardianStudentLinkInsert {
  const relationship = input.relationshipLabel?.trim() || null;
  return {
    id: generateAcadiaId('gsl'),
    tenantId: input.tenantId,
    guardianUserId: input.parentAuthId,
    studentProfileId: input.studentProfileId,
    relationshipLabel: relationship,
    consentGrantedAt: input.now,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export type ProvisionGuardianResult =
  | { ok: true; createdUser: boolean; linkId: string }
  | { ok: false; message: string; status: number; createdUser: boolean };

export async function provisionGuardianProfileAndLink(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    actorUserId: string;
    parentAuthId: string;
    parentEmail: string;
    parentName: string;
    studentProfileId: string;
    relationshipLabel?: string | null;
  },
): Promise<ProvisionGuardianResult> {
  const now = new Date().toISOString();

  const { data: roles, error: roleError } = await admin
    .from('UserRole')
    .select('id, slug')
    .eq('isTrashed', false)
    .in('slug', [...GUARDIAN_ROLE_SLUGS]);

  if (roleError) {
    return {
      ok: false,
      message: roleError.message ?? 'Failed to look up parent role.',
      status: 500,
      createdUser: false,
    };
  }

  const roleId = pickGuardianRoleId((roles ?? []) as GuardianRoleRow[]);
  if (!roleId) {
    return {
      ok: false,
      message: 'Parent/guardian role is not configured.',
      status: 500,
      createdUser: false,
    };
  }

  const { data: existingUser, error: existingUserError } = await admin
    .from('User')
    .select('id')
    .eq('id', input.parentAuthId)
    .maybeSingle();

  if (existingUserError) {
    return {
      ok: false,
      message: existingUserError.message ?? 'Failed to look up parent user.',
      status: 500,
      createdUser: false,
    };
  }

  let createdUser = false;
  if (!existingUser?.id) {
    const row = buildGuardianUserInsert({
      parentAuthId: input.parentAuthId,
      email: input.parentEmail,
      name: input.parentName,
      roleId,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      now,
    });
    const { error: userError } = await admin.from('User').insert(row);
    if (userError) {
      return {
        ok: false,
        message: userError.message ?? 'Failed to create parent user profile.',
        status: 400,
        createdUser: false,
      };
    }
    createdUser = true;
  }

  const { data: existingLink, error: existingLinkError } = await admin
    .from('GuardianStudentLink')
    .select('id')
    .eq('tenantId', input.tenantId)
    .eq('guardianUserId', input.parentAuthId)
    .eq('studentProfileId', input.studentProfileId)
    .maybeSingle();

  if (existingLinkError) {
    return {
      ok: false,
      message: existingLinkError.message ?? 'Failed to look up guardian link.',
      status: 500,
      createdUser,
    };
  }

  if (existingLink?.id) {
    return { ok: true, createdUser, linkId: existingLink.id as string };
  }

  const link = buildGuardianStudentLinkInsert({
    tenantId: input.tenantId,
    parentAuthId: input.parentAuthId,
    studentProfileId: input.studentProfileId,
    relationshipLabel: input.relationshipLabel,
    now,
  });

  const { error: linkError } = await admin.from('GuardianStudentLink').insert(link);
  if (linkError) {
    return {
      ok: false,
      message: linkError.message ?? 'Failed to link parent to student.',
      status: 400,
      createdUser,
    };
  }

  return { ok: true, createdUser, linkId: link.id };
}
