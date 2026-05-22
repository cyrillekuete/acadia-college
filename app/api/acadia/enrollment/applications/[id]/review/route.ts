import { NextResponse } from 'next/server';
import { reviewApplicationSchema } from '@/lib/acadia/enrollment-schemas';
import { resolveClassForEnrollment } from '@/lib/acadia/class-assignment';
import {
  parseAcademicBranch,
  parseAcademicSubSystem,
} from '@/lib/acadia/education-system';
import {
  applicantDisplayName,
  generateRegistrationNumber,
} from '@/lib/acadia/enrollment';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { getAppOrigin } from '@/lib/auth/app-origin';
import { sendPasswordRecoveryEmail } from '@/lib/auth/password-recovery';
import {
  checkRegistrationNumberAvailable,
  checkRegistryStudentEmail,
} from '@/lib/acadia/registry-lookups';
import { requireRegistryApi } from '@/lib/acadia/require-registry-api';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { UserStatus } from '@/app/models/user';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireRegistryApi();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { id: applicationId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = reviewApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: application, error: appError } = await supabase
    .from('EnrollmentApplication')
    .select(
      `
      id,
      tenantId,
      kind,
      status,
      studentProfileId,
      firstNameEn,
      lastNameEn,
      firstNameFr,
      lastNameFr,
      email,
      subSystem,
      branch,
      levelId,
      academicYearId,
      AcademicYear!EnrollmentApplication_academicYearId_tenantId_fkey ( label )
    `,
    )
    .eq('id', applicationId)
    .eq('tenantId', auth.ctx.tenantId)
    .maybeSingle();

  if (appError || !application) {
    return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
  }

  if (application.status !== 'PENDING') {
    return NextResponse.json(
      { message: 'Only pending applications can be reviewed.' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const applicantName = applicantDisplayName(
    application.firstNameEn,
    application.lastNameEn,
    application.firstNameFr,
    application.lastNameFr,
  );

  if (parsed.data.decision === 'reject') {
    const { error: rejectError } = await supabase
      .from('EnrollmentApplication')
      .update({
        status: 'REJECTED',
        rejectionReason: parsed.data.rejectionReason,
        reviewedAt: now,
        reviewedByUserId: auth.ctx.actorUserId,
        updatedAt: now,
      })
      .eq('id', applicationId)
      .eq('tenantId', auth.ctx.tenantId);

    if (rejectError) {
      return NextResponse.json(
        { message: rejectError.message ?? 'Failed to reject application.' },
        { status: 400 },
      );
    }

    await appendSystemLog(supabase, {
      userId: auth.ctx.actorUserId,
      event: 'enrollment.application_rejected',
      description: `Rejected enrollment application for ${applicantName}`,
      entityId: applicationId,
      entityType: 'EnrollmentApplication',
    });

    return NextResponse.json({ status: 'REJECTED' });
  }

  let studentProfileId = application.studentProfileId as string | null;

  if (application.kind === 'NEW' && !studentProfileId) {
    const emailCheck = await checkRegistryStudentEmail(
      supabase,
      auth.ctx.tenantId,
      String(application.email),
      { excludeApplicationId: applicationId },
    );
    if (!emailCheck.ok) {
      return NextResponse.json({ message: emailCheck.message }, { status: 400 });
    }

    if (!isAdminClientConfigured()) {
      return NextResponse.json(
        { message: 'Student provisioning is not configured on this server.' },
        { status: 503 },
      );
    }

    const { data: studentRole, error: roleError } = await supabase
      .from('UserRole')
      .select('id')
      .eq('slug', 'student')
      .maybeSingle();

    if (roleError || !studentRole?.id) {
      return NextResponse.json(
        { message: 'Student role is not configured.' },
        { status: 500 },
      );
    }

    const admin = createAdminClient();
    const tempPassword = `Acadia${crypto.randomUUID().slice(0, 8)}!`;

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: String(application.email).trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: applicantName },
    });

    if (authError || !authUser.user) {
      const message =
        authError?.message?.includes('already been registered') ||
        authError?.message?.includes('already exists')
          ? 'A user with this email already exists.'
          : authError?.message ?? 'Failed to create auth user.';
      return NextResponse.json({ message }, { status: 400 });
    }

    const userId = authUser.user.id;
    const yearLabel = Array.isArray(application.AcademicYear)
      ? application.AcademicYear[0]?.label
      : (application.AcademicYear as { label?: string } | null)?.label;

    const { error: userInsertError } = await supabase.from('User').insert({
      id: userId,
      email: String(application.email).trim().toLowerCase(),
      name: applicantName,
      roleId: studentRole.id,
      tenantId: auth.ctx.tenantId,
      status: UserStatus.ACTIVE,
      invitedByUserId: auth.ctx.actorUserId,
      createdAt: now,
      updatedAt: now,
      isTrashed: false,
      isProtected: false,
    });

    if (userInsertError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { message: userInsertError.message ?? 'Failed to create user profile.' },
        { status: 400 },
      );
    }

    studentProfileId = generateAcadiaId('student');
    const registrationNumber = generateRegistrationNumber(yearLabel);

    const matriculeCheck = await checkRegistrationNumberAvailable(
      supabase,
      auth.ctx.tenantId,
      registrationNumber,
    );
    if (!matriculeCheck.ok) {
      await admin.auth.admin.deleteUser(userId);
      await supabase.from('User').delete().eq('id', userId);
      return NextResponse.json({ message: matriculeCheck.message }, { status: 400 });
    }

    const { error: profileError } = await supabase.from('StudentProfile').insert({
      id: studentProfileId,
      tenantId: auth.ctx.tenantId,
      userId,
      registrationNumber,
      subSystem: application.subSystem,
      branch: application.branch,
      currentLevelId: application.levelId,
      isActive: true,
      alumniDirectoryOptIn: false,
      updatedAt: now,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      await supabase.from('User').delete().eq('id', userId);
      return NextResponse.json(
        { message: profileError.message ?? 'Failed to create student profile.' },
        { status: 400 },
      );
    }

    const recovery = await sendPasswordRecoveryEmail(
      admin,
      String(application.email),
      getAppOrigin(),
    );
    if (!recovery.ok) {
      console.warn(
        '[enrollment/review] Password reset email failed:',
        recovery.message,
      );
      await appendSystemLog(supabase, {
        userId: auth.ctx.actorUserId,
        event: 'enrollment.password_reset_failed',
        description: `Failed to send password reset to ${application.email}: ${recovery.message}`,
        entityId: applicationId,
        entityType: 'EnrollmentApplication',
      });
    }
  }

  if (!studentProfileId) {
    return NextResponse.json(
      { message: 'Student profile is required for re-enrollment.' },
      { status: 400 },
    );
  }

  const previousStudentProfileId = application.studentProfileId as string | null;

  const { data: approvedRows, error: approveError } = await supabase
    .from('EnrollmentApplication')
    .update({
      status: 'APPROVED',
      studentProfileId,
      rejectionReason: null,
      reviewedAt: now,
      reviewedByUserId: auth.ctx.actorUserId,
      updatedAt: now,
    })
    .eq('id', applicationId)
    .eq('tenantId', auth.ctx.tenantId)
    .eq('status', 'PENDING')
    .select('id');

  if (approveError) {
    return NextResponse.json(
      { message: approveError.message ?? 'Failed to approve application.' },
      { status: 400 },
    );
  }

  if (!approvedRows?.length) {
    return NextResponse.json(
      { message: 'Application is no longer pending.' },
      { status: 409 },
    );
  }

  const subSystem = parseAcademicSubSystem(application.subSystem);
  const branch = parseAcademicBranch(application.branch);
  if (!subSystem || !branch) {
    return NextResponse.json(
      { message: 'Application is missing a valid sub-system or branch.' },
      { status: 400 },
    );
  }

  const classResolution = await resolveClassForEnrollment(
    supabase,
    auth.ctx.tenantId,
    application.levelId as string,
    subSystem,
    branch,
  );

  let classId: string | null = classResolution.classId;
  if (classResolution.status === 'ambiguous') {
    const requestedClassId = parsed.data.classId?.trim();
    if (!requestedClassId) {
      return NextResponse.json(
        {
          message:
            'Multiple classes match this level and stream. Select a class.',
          candidateClassIds: classResolution.candidateIds,
        },
        { status: 400 },
      );
    }
    if (!classResolution.candidateIds.includes(requestedClassId)) {
      return NextResponse.json(
        { message: 'Selected class is not valid for this enrollment.' },
        { status: 400 },
      );
    }
    classId = requestedClassId;
  } else if (classResolution.status === 'none') {
    const requestedClassId = parsed.data.classId?.trim();
    if (!requestedClassId) {
      return NextResponse.json(
        {
          message:
            'No class matches this level and stream. Select a class to continue.',
          candidateClassIds: [],
        },
        { status: 400 },
      );
    }
    classId = requestedClassId;
  }

  const enrollmentId = generateAcadiaId('enr');
  const { error: enrollmentError } = await supabase.from('StudentEnrollment').insert({
    id: enrollmentId,
    tenantId: auth.ctx.tenantId,
    studentProfileId,
    academicYearId: application.academicYearId,
    subSystem: application.subSystem,
    branch: application.branch,
    levelId: application.levelId,
    classId,
    status: 'ENROLLED',
    applicationId,
    createdAt: now,
    updatedAt: now,
  });

  if (enrollmentError) {
    const { error: revertError } = await supabase
      .from('EnrollmentApplication')
      .update({
        status: 'PENDING',
        studentProfileId: previousStudentProfileId,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
        updatedAt: now,
      })
      .eq('id', applicationId)
      .eq('tenantId', auth.ctx.tenantId)
      .eq('status', 'APPROVED');

    const message = enrollmentError.message ?? 'Failed to create enrollment.';
    if (revertError) {
      return NextResponse.json(
        {
          message: `${message} Application approval could not be rolled back; contact an administrator.`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ message }, { status: 400 });
  }

  await appendSystemLog(supabase, {
    userId: auth.ctx.actorUserId,
    event: 'enrollment.application_approved',
    description: `Approved enrollment for ${applicantName}`,
    entityId: applicationId,
    entityType: 'EnrollmentApplication',
    meta: { studentProfileId, enrollmentId },
  });

  return NextResponse.json({
    status: 'APPROVED',
    studentProfileId,
    enrollmentId,
  });
}
