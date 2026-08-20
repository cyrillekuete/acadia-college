import { NextResponse } from 'next/server';
import {
  requireClassIdForEnrollment,
  resolveClassForEnrollment,
} from '@/lib/acadia/class-assignment';
import { syncStudentFeeAccountAfterClassChange } from '@/lib/acadia/fee-account-provision';
import { getMutationErrorMessage } from '@/lib/acadia/query-errors';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { studentClassMigrationSchema } from '@/lib/acadia/student-schemas';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

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

  const parsed = studentClassMigrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const supabase = await createClient();

  try {
    const resolution = await resolveClassForEnrollment(
      supabase,
      auth.ctx.tenantId,
      values.levelId,
      values.subSystem,
      values.branch,
    );
    const classId = requireClassIdForEnrollment(values.classId, resolution);

    const { data, error } = await supabase.rpc('acadia_migrate_student_class', {
      p_tenant_id: auth.ctx.tenantId,
      p_profile_id: profileId.trim(),
      p_academic_year_id: values.academicYearId,
      p_sub_system: values.subSystem,
      p_branch: values.branch,
      p_level_id: values.levelId,
      p_class_id: classId,
    });

    if (error) {
      return NextResponse.json(
        { message: getMutationErrorMessage(error, error.message) },
        { status: 400 },
      );
    }

    const payload = (data ?? {}) as {
      enrollmentId?: string;
      previousClassId?: string | null;
    };
    const enrollmentId = payload.enrollmentId;
    if (!enrollmentId) {
      return NextResponse.json(
        { message: 'Class placement could not be saved.' },
        { status: 400 },
      );
    }

    const feeResult = await syncStudentFeeAccountAfterClassChange(supabase, {
      tenantId: auth.ctx.tenantId,
      studentProfileId: profileId.trim(),
      academicYearId: values.academicYearId,
      subSystem: values.subSystem,
      branch: values.branch,
      studentEnrollmentId: enrollmentId,
      classId,
      previousClassId: payload.previousClassId ?? null,
      actorUserId: auth.ctx.actorUserId,
    });

    const note = values.note?.trim();
    void appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'student.class_migrated',
      description: note
        ? `Moved student ${profileId.trim()} to class ${classId}. ${note}`
        : `Moved student ${profileId.trim()} to class ${classId}`,
      entityId: profileId.trim(),
      entityType: 'StudentProfile',
      meta: {
        academicYearId: values.academicYearId,
        enrollmentId,
        classId,
        previousClassId: payload.previousClassId ?? null,
        note: note || null,
      },
    });

    return NextResponse.json({
      ok: true,
      enrollmentId,
      classId,
      feeWarning:
        !feeResult.ok && feeResult.reason !== 'no_class' ? feeResult.message : null,
    });
  } catch (error) {
    return NextResponse.json(
      { message: getMutationErrorMessage(error) },
      { status: 400 },
    );
  }
}
