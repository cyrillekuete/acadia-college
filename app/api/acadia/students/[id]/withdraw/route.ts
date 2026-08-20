import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { withdrawStudentFromYear } from '@/lib/acadia/student-withdraw';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const withdrawBodySchema = z.object({
  academicYearId: z.string().min(1),
  deactivateProfile: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = withdrawBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const result = await withdrawStudentFromYear(supabase, {
    tenantId: auth.ctx.tenantId,
    profileId: profileId.trim(),
    academicYearId: parsed.data.academicYearId,
    actorUserId: auth.ctx.actorUserId,
    deactivateProfile: parsed.data.deactivateProfile,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(result);
}
