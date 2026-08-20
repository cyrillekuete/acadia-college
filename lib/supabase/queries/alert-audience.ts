import type { SupabaseClient } from '@supabase/supabase-js';
import {
  chunkIds,
  eligibleGuardianLinks,
  filterActiveGroupMembers,
  type AlertGroupMemberRow,
  type EnrollmentClassRow,
  type GuardianStudentLinkRow,
} from '@/lib/acadia/alerts';
import { unwrapRelation } from '@/lib/acadia/record-display';

type Client = SupabaseClient;

export type AlertAudienceBundle = {
  links: GuardianStudentLinkRow[];
  enrollments: EnrollmentClassRow[];
  groupMembers: AlertGroupMemberRow[];
  eligibleLinks: GuardianStudentLinkRow[];
  groupLinks: GuardianStudentLinkRow[];
  activeGroupMembers: AlertGroupMemberRow[];
  activeGuardianIds: Set<string>;
};

async function selectInChunks<T>(
  ids: string[],
  fetchChunk: (
    chunk: string[],
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (const chunk of chunkIds(ids)) {
    const { data, error } = await fetchChunk(chunk);
    if (error) {
      throw error;
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

export async function fetchAlertAudience(
  supabase: Client,
  tenantId: string,
  academicYearId: string | null,
): Promise<AlertAudienceBundle> {
  const [linksResult, enrollmentsResult, membersResult] = await Promise.all([
    supabase
      .from('GuardianStudentLink')
      .select('guardianUserId, studentProfileId')
      .eq('tenantId', tenantId)
      .is('consentRevokedAt', null),
    academicYearId
      ? supabase
          .from('StudentEnrollment')
          .select('studentProfileId, classId')
          .eq('tenantId', tenantId)
          .eq('academicYearId', academicYearId)
          .eq('status', 'ENROLLED')
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('SchoolAlertGroupMember')
      .select('groupId, guardianUserId')
      .eq('tenantId', tenantId),
  ]);

  if (linksResult.error) {
    throw linksResult.error;
  }
  if (enrollmentsResult.error) {
    throw enrollmentsResult.error;
  }
  if (membersResult.error) {
    throw membersResult.error;
  }

  const links = (linksResult.data ?? []) as GuardianStudentLinkRow[];
  const enrollments = (enrollmentsResult.data ?? []) as EnrollmentClassRow[];
  const groupMembers = (membersResult.data ?? []) as AlertGroupMemberRow[];

  const guardianIds = [
    ...new Set([
      ...links.map((row) => row.guardianUserId),
      ...groupMembers.map((row) => row.guardianUserId),
    ]),
  ];
  const studentIds = [...new Set(links.map((row) => row.studentProfileId))];

  const guardianRows = await selectInChunks(guardianIds, (chunk) =>
    supabase
      .from('User')
      .select('id, status, isTrashed, UserRole:roleId ( slug )')
      .eq('tenantId', tenantId)
      .in('id', chunk),
  );

  const activeGuardianIds = new Set(
    guardianRows
      .filter((row) => {
        const role = unwrapRelation<{ slug?: string }>(
          (row as { UserRole?: unknown }).UserRole,
        );
        const slug = role?.slug?.toLowerCase() ?? '';
        const isGuardian = slug === 'guardian' || slug === 'parent';
        return (
          isGuardian &&
          row.status === 'ACTIVE' &&
          row.isTrashed !== true
        );
      })
      .map((row) => row.id as string),
  );

  const studentRows = await selectInChunks(studentIds, (chunk) =>
    supabase
      .from('StudentProfile')
      .select('id, isActive')
      .eq('tenantId', tenantId)
      .in('id', chunk),
  );
  const activeStudentIds = new Set(
    studentRows.filter((row) => row.isActive !== false).map((row) => row.id as string),
  );
  const enrolledStudentIds = new Set(enrollments.map((row) => row.studentProfileId));

  const eligibleLinks = eligibleGuardianLinks(links, {
    activeGuardianIds,
    enrolledStudentIds,
    activeStudentIds,
  });
  const groupLinks = eligibleGuardianLinks(links, {
    activeGuardianIds,
    activeStudentIds,
  });

  return {
    links,
    enrollments,
    groupMembers,
    eligibleLinks,
    groupLinks,
    activeGroupMembers: filterActiveGroupMembers(groupMembers, activeGuardianIds),
    activeGuardianIds,
  };
}
