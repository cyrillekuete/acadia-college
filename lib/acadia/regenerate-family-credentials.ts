import type { SupabaseClient } from '@supabase/supabase-js';
import { generateTemporaryPassword } from '@/lib/acadia/generate-temporary-password';
import { normalizePhoneForLookup } from '@/lib/acadia/phone';
import { buildParentSystemAuthEmail } from '@/lib/acadia/provision-accounts';

export type RegenerateFamilyCredentialsResult =
  | {
      ok: true;
      studentId: string;
      studentLoginEmail: string;
      studentTemporaryPassword: string;
      parentCode: string;
      parentLoginEmail: string;
      parentTemporaryPassword: string | null;
    }
  | { ok: false; message: string; status: number };

type ParentAuthUser = {
  id: string;
  email: string;
};

async function findParentAuthUser(
  admin: SupabaseClient,
  tenantId: string,
  parent: { email: string | null; phone: string | null },
): Promise<ParentAuthUser | null> {
  const parentEmail = parent.email?.trim().toLowerCase() ?? '';
  if (parentEmail) {
    const { data, error } = await admin
      .from('users')
      .select('id, email, role')
      .eq('email', parentEmail)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (data?.role === 'parent' && data.email) {
      return { id: data.id as string, email: data.email as string };
    }
  }

  const phone = parent.phone?.trim() ?? '';
  const normalizedPhone = normalizePhoneForLookup(phone);
  if (!normalizedPhone) {
    return null;
  }

  const syntheticEmail = buildParentSystemAuthEmail(tenantId, normalizedPhone);
  const { data: bySynthetic, error: syntheticError } = await admin
    .from('users')
    .select('id, email, role')
    .eq('email', syntheticEmail)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (syntheticError) {
    throw syntheticError;
  }
  if (bySynthetic?.role === 'parent' && bySynthetic.email) {
    return {
      id: bySynthetic.id as string,
      email: bySynthetic.email as string,
    };
  }

  const { data: candidates, error: phoneError } = await admin
    .from('users')
    .select('id, email, role, phone')
    .eq('role', 'parent')
    .eq('tenant_id', tenantId)
    .not('phone', 'is', null);

  if (phoneError) {
    throw phoneError;
  }

  const match = candidates?.find(
    (row) =>
      row.phone &&
      normalizePhoneForLookup(row.phone as string) === normalizedPhone,
  );
  if (match?.email) {
    return { id: match.id as string, email: match.email as string };
  }

  return null;
}

/**
 * Issue new temporary passwords for an existing student and linked parent.
 * Previous passwords cannot be recovered from Auth.
 */
export async function regenerateFamilyCredentials(
  admin: SupabaseClient,
  tenantId: string,
  studentProfileId: string,
): Promise<RegenerateFamilyCredentialsResult> {
  const { data: profile, error: profileError } = await admin
    .from('StudentProfile')
    .select('id, userId, registrationNumber')
    .eq('id', studentProfileId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      message: profileError.message ?? 'Failed to load student profile.',
      status: 500,
    };
  }
  if (!profile?.userId) {
    return { ok: false, message: 'Student not found.', status: 404 };
  }

  const studentAuthId = profile.userId as string;

  const { data: appUser, error: appUserError } = await admin
    .from('User')
    .select('id, email')
    .eq('id', studentAuthId)
    .eq('tenantId', tenantId)
    .maybeSingle();

  if (appUserError) {
    return {
      ok: false,
      message: appUserError.message ?? 'Failed to load student login.',
      status: 500,
    };
  }

  let studentLoginEmail = (appUser?.email as string | null)?.trim().toLowerCase() ?? '';
  if (!studentLoginEmail) {
    const { data: legacyUser, error: legacyUserError } = await admin
      .from('users')
      .select('email')
      .eq('id', studentAuthId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (legacyUserError) {
      return {
        ok: false,
        message: legacyUserError.message ?? 'Failed to load student login.',
        status: 500,
      };
    }
    studentLoginEmail =
      (legacyUser?.email as string | null)?.trim().toLowerCase() ?? '';
  }

  if (!studentLoginEmail) {
    return {
      ok: false,
      message: 'This student does not have a login email.',
      status: 400,
    };
  }

  const { data: profileLink, error: linkError } = await admin
    .from('user_profiles')
    .select('role_specific_id')
    .eq('user_id', studentAuthId)
    .maybeSingle();

  if (linkError) {
    return {
      ok: false,
      message: linkError.message ?? 'Failed to resolve student record.',
      status: 500,
    };
  }

  const legacyStudentId =
    (profileLink?.role_specific_id as string | null)?.trim() ||
    (profile.registrationNumber as string);

  const { data: parentRows, error: parentError } = legacyStudentId
    ? await admin
        .from('parents')
        .select('parent_code, email, phone')
        .eq('student_id', legacyStudentId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(1)
    : { data: null, error: null };

  if (parentError) {
    return {
      ok: false,
      message: parentError.message ?? 'Failed to load parent account.',
      status: 500,
    };
  }

  const parentRow = parentRows?.[0] ?? null;

  let parentAuth: ParentAuthUser | null = null;
  if (parentRow) {
    try {
      parentAuth = await findParentAuthUser(admin, tenantId, {
        email: (parentRow.email as string | null) ?? null,
        phone: (parentRow.phone as string | null) ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to look up parent account.';
      return { ok: false, message, status: 500 };
    }

    if (!parentAuth) {
      return {
        ok: false,
        message:
          'A parent record exists, but the parent login account could not be found.',
        status: 400,
      };
    }
  }

  // Reset the parent first so a parent Auth failure cannot leave the student
  // password already changed with no credentials file returned.
  let parentTemporaryPassword: string | null = null;
  if (parentAuth) {
    parentTemporaryPassword = generateTemporaryPassword();
    const { error: parentAuthError } = await admin.auth.admin.updateUserById(
      parentAuth.id,
      { password: parentTemporaryPassword },
    );
    if (parentAuthError) {
      return {
        ok: false,
        message:
          parentAuthError.message ??
          'Failed to reset the parent password. The student password was not changed.',
        status: 400,
      };
    }
  }

  const studentTemporaryPassword = generateTemporaryPassword();
  const { error: studentAuthError } = await admin.auth.admin.updateUserById(
    studentAuthId,
    { password: studentTemporaryPassword },
  );
  if (studentAuthError) {
    const studentMessage =
      studentAuthError.message ?? 'Failed to reset the student password.';
    return {
      ok: false,
      message: parentAuth
        ? `${studentMessage} The parent password was already reset — download credentials again.`
        : studentMessage,
      status: 400,
    };
  }

  return {
    ok: true,
    studentId: legacyStudentId,
    studentLoginEmail,
    studentTemporaryPassword,
    parentCode: (parentRow?.parent_code as string | undefined) ?? '—',
    parentLoginEmail: parentAuth?.email ?? 'Not linked',
    parentTemporaryPassword,
  };
}
