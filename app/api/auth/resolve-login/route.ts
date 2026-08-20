import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';

const bodySchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').max(200),
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_CODE_PATTERN = /^TCH-\d{4}-\d{5}$/i;

export async function POST(request: Request) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { message: 'Login resolution is not configured on this server.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const identifier = parsed.data.identifier.trim();

  if (EMAIL_PATTERN.test(identifier)) {
    return NextResponse.json({ email: identifier.toLowerCase() });
  }

  const normalizedCode = identifier.toUpperCase();
  if (!STAFF_CODE_PATTERN.test(normalizedCode)) {
    return NextResponse.json(
      { message: 'Enter a valid email or Teacher ID (e.g. TCH-2026-12345).' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: staffRows, error: staffError } = await admin
    .from('StaffProfile')
    .select('userId, User!StaffProfile_userId_tenantId_fkey ( email )')
    .eq('staffCode', normalizedCode)
    .eq('isActive', true)
    .limit(2);

  if (staffError) {
    console.error('[resolve-login] StaffProfile lookup:', staffError.message);
    return NextResponse.json(
      { message: 'Unable to resolve login identifier.' },
      { status: 500 },
    );
  }

  if ((staffRows?.length ?? 0) !== 1) {
    return NextResponse.json(
      { message: 'Invalid email or Teacher ID.' },
      { status: 404 },
    );
  }

  const staffRow = staffRows?.[0];
  if (!staffRow) {
    return NextResponse.json(
      { message: 'Invalid email or Teacher ID.' },
      { status: 404 },
    );
  }

  const user = Array.isArray(staffRow?.User) ? staffRow.User[0] : staffRow?.User;
  const email =
    user && typeof user === 'object' && 'email' in user
      ? (user.email as string | null)?.trim().toLowerCase()
      : null;

  if (!email) {
    return NextResponse.json(
      { message: 'Invalid email or Teacher ID.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ email });
}
