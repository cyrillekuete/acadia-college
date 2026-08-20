import type { SupabaseClient } from '@supabase/supabase-js';
import { pickPreferredEnrolledClassId } from '@/lib/acadia/student-enrollment';
import { embed, FK } from '@/lib/supabase/embed-selects';
import type { Database } from '@/lib/supabase/database.types';
import { unwrapRelation } from '@/lib/acadia/record-display';

type Client = SupabaseClient<Database>;

export async function fetchStaffProfileIdForUser(
  supabase: Client,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StaffProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', userId)
    .eq('isActive', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function fetchStudentProfileIdForUser(
  supabase: Client,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('StudentProfile')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('userId', userId)
    .eq('isActive', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export type StudentEnrollmentSummary = {
  classId: string;
  className: string;
};

type StudentEnrollmentSummaryRow = {
  classId: string | null;
  Class?: unknown;
};

export async function fetchStudentEnrollmentSummary(
  supabase: Client,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
): Promise<StudentEnrollmentSummary | null> {
  const { data, error } = await supabase
    .from('StudentEnrollment')
    .select(
      [
        'classId',
        'createdAt',
        embed('Class', FK.StudentEnrollment_class, 'name'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .order('createdAt', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as (StudentEnrollmentSummaryRow & {
    createdAt: string;
  })[];

  const classId = pickPreferredEnrolledClassId(rows);
  if (!classId) {
    return null;
  }

  const preferredRow =
    rows.find((row) => row.classId === classId) ?? rows[0] ?? null;
  const classRow = unwrapRelation<{ name?: string }>(preferredRow?.Class);

  return {
    classId,
    className: classRow?.name?.trim() || 'Your class',
  };
}

export type LinkedGuardianStudent = {
  studentProfileId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
};

export async function fetchLinkedStudentsForGuardian(
  supabase: Client,
  tenantId: string,
  guardianUserId: string,
  academicYearId: string,
): Promise<LinkedGuardianStudent[]> {
  const { data: links, error: linksError } = await supabase
    .from('GuardianStudentLink')
    .select('studentProfileId')
    .eq('tenantId', tenantId)
    .eq('guardianUserId', guardianUserId)
    .is('consentRevokedAt', null);

  if (linksError) {
    throw linksError;
  }

  const studentProfileIds = (links ?? [])
    .map((row) => row.studentProfileId as string)
    .filter(Boolean);

  if (studentProfileIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('StudentProfile')
    .select(
      'id, registrationNumber, User!StudentProfile_userId_tenantId_fkey ( name )',
    )
    .eq('tenantId', tenantId)
    .in('id', studentProfileIds)
    .eq('isActive', true);

  if (profilesError) {
    throw profilesError;
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('StudentEnrollment')
    .select(
      [
        'studentProfileId',
        'classId',
        'createdAt',
        embed('Class', FK.StudentEnrollment_class, 'name'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'ENROLLED')
    .in('studentProfileId', studentProfileIds)
    .order('createdAt', { ascending: false });

  if (enrollmentsError) {
    throw enrollmentsError;
  }

  const enrollmentByStudent = new Map<
    string,
    { classId: string | null; className: string | null }
  >();

  for (const studentProfileId of studentProfileIds) {
    const rows = (enrollments ?? []).filter(
      (row) => row.studentProfileId === studentProfileId,
    ) as Array<{
      classId: string | null;
      createdAt: string;
      Class?: unknown;
    }>;
    const classId = pickPreferredEnrolledClassId(rows);
    const row = rows.find((entry) => entry.classId === classId) ?? rows[0];
    const classRow = unwrapRelation<{ name?: string }>(row?.Class);
    enrollmentByStudent.set(studentProfileId, {
      classId,
      className: classRow?.name?.trim() ?? null,
    });
  }

  return (profiles ?? [])
    .map((profile) => {
      const user = unwrapRelation<{ name?: string | null }>(profile.User);
      const enrollment = enrollmentByStudent.get(profile.id as string);
      return {
        studentProfileId: profile.id as string,
        studentName:
          user?.name?.trim() ||
          (profile.registrationNumber as string | undefined)?.trim() ||
          'Linked student',
        classId: enrollment?.classId ?? null,
        className: enrollment?.className ?? null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}
