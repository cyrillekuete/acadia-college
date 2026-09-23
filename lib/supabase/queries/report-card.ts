import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_ACADEMIC_STRUCTURE,
  type AcademicYearStructure,
} from '@/lib/acadia/academic-calendar';
import { uniqueIds } from '@/lib/acadia/staff-class-assignments';
import { branchLabel } from '@/lib/acadia/education-system';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import {
  buildReportCardData,
  resolveReportCardGrouping,
  type ReportCardBundle,
  type ReportCardGroupingRef,
  type ReportCardMarkRow,
  type ReportCardSubjectDef,
} from '@/lib/acadia/report-card';
import {
  resolveReportCardInstitutionNames,
  resolveReportCardLetterhead,
  type ReportCardData,
  type ReportCardTerm,
} from '@/lib/acadia/report-card-types';
import { resolveReportCardTemplate } from '@/lib/acadia/report-card-templates';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { fetchStudentTermDiscipline } from '@/lib/supabase/queries/class-discipline';
import { fetchReportCardTemplatePreference } from '@/lib/supabase/queries/report-card-templates';
import { splitStudentName } from '@/lib/supabase/queries/student-query-helpers';
import { fetchAcadiaTenant } from '@/lib/supabase/queries/tenant';
import { resolveReportCardLogoUrl, getTenantAssetPublicUrl } from '@/lib/supabase/storage';

const STUDENT_PROFILE_SELECT = `
  id,
  userId,
  matriculeNumber,
  registrationNumber,
  branch,
  ${embed('User', FK.StudentProfile_user, 'id, name, avatar')}
`;

const ENROLLMENT_SELECT = `
  classId,
  status,
  createdAt,
  branch,
  isRepeater,
  ${embed('Class', FK.StudentEnrollment_class, 'id, name, staffProfileId, branch, subSystem')}
`;

const CLASS_SUBJECT_SELECT = `
  classId,
  subjectId,
  groupingId,
  forceUngrouped,
  ${embed(
    'Subject',
    FK.ClassSubject_subject,
    [
      'id, nameEn, nameFr, code, coefficient, subjectType, hasSubBranches',
      embed('SubjectGrouping', FK.Subject_grouping, 'id, nameEn, nameFr, sortOrder'),
    ].join(', '),
  )},
  ClassGrouping:${embed('SubjectGrouping', FK.ClassSubject_grouping, 'id, nameEn, nameFr, sortOrder')}
`;

const MARK_SELECT = `
  studentProfileId,
  subjectId,
  subjectSubBranchId,
  totalScore,
  examSessionId,
  ${embed('Subject', FK.SubjectMark_subject, 'coefficient')},
  ${embed('SubjectSubBranch', FK.SubjectMark_subBranch, 'coefficient')}
`;

const STAFF_SELECT = `id, ${embed('User', FK.StaffProfile_user, 'name')}`;

const SUBJECT_TEACHER_SELECT = `
  subjectId,
  ${embed(
    'StaffProfile',
    FK.StaffClassSubjectAssignment_staffProfile,
    `id, ${embed('User', FK.StaffProfile_user, 'name')}`,
  )}
`;

function formatDob(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB');
}

function formatSex(value: string | null | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'm' || normalized === 'male') return 'M';
  if (normalized === 'f' || normalized === 'female') return 'F';
  return value?.trim() || '—';
}

function chunkIds<T>(ids: T[], size = 200): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export async function fetchReportCardBundle(
  supabase: SupabaseClient,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
  classId?: string | null,
): Promise<ReportCardBundle> {
  const { data: profileRow, error: profileError } = await supabase
    .from('StudentProfile')
    .select(STUDENT_PROFILE_SELECT)
    .eq('tenantId', tenantId)
    .eq('id', studentProfileId)
    .maybeSingle();
  const profile = profileRow as {
    id: string;
    userId: string;
    matriculeNumber: string | null;
    registrationNumber: string;
    branch: string | null;
    User?: unknown;
  } | null;

  if (profileError) {
    throw new Error(getQueryErrorMessage(profileError));
  }
  if (!profile) {
    throw new Error('Student not found.');
  }

  let enrollmentQuery = supabase
    .from('StudentEnrollment')
    .select(ENROLLMENT_SELECT)
    .eq('tenantId', tenantId)
    .eq('studentProfileId', studentProfileId)
    .eq('academicYearId', academicYearId);

  if (classId) {
    enrollmentQuery = enrollmentQuery.eq('classId', classId);
  }

  const { data: yearEnrollmentRows, error: enrollmentError } = await enrollmentQuery.order(
    'createdAt',
    { ascending: false },
  );
  const yearEnrollments = (yearEnrollmentRows ?? []) as unknown as Array<{
    classId: string | null;
    status: string | null;
    createdAt: string | null;
    branch: string | null;
    isRepeater?: boolean | null;
    Class?: unknown;
  }>;
  const enrollment =
    yearEnrollments.find((row) => row.status === 'ENROLLED') ?? yearEnrollments[0] ?? null;

  if (enrollmentError) {
    throw new Error(getQueryErrorMessage(enrollmentError));
  }

  const classRow = unwrapRelation<{
    id?: string;
    name?: string;
    staffProfileId?: string | null;
    branch?: string | null;
    subSystem?: string | null;
  }>(enrollment?.Class);
  const resolvedClassId = (enrollment?.classId as string | null) ?? classRow?.id ?? null;
  if (!resolvedClassId) {
    throw new Error('Student is not assigned to a class for this academic year.');
  }

  const yearClassIds = uniqueIds(
    yearEnrollments.map((row) => row.classId ?? '').concat(resolvedClassId),
  );
  const priorEnrollment = yearEnrollments.find(
    (row) => row.classId && row.classId !== resolvedClassId,
  );
  const priorClass = unwrapRelation<{ name?: string | null }>(priorEnrollment?.Class);
  const transferredFrom = priorClass
    ? {
        className: priorClass.name?.trim() || '—',
        enrolledAt: enrollment?.createdAt ?? priorEnrollment?.createdAt ?? null,
      }
    : null;

  const [
    yearResult,
    sequenceResult,
    classSubjectResult,
    subBranchResult,
    cohortResult,
    tenant,
    disciplineByTerm,
    teacherResult,
  ] = await Promise.all([
    supabase
      .from('AcademicYear')
      .select('id, label, termsPerYear, sequencesPerTerm, sequencesPerYear')
      .eq('tenantId', tenantId)
      .eq('id', academicYearId)
      .maybeSingle(),
    supabase
      .from('AcademicSequence')
      .select('id, number, numberInTerm, termId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId),
    supabase
      .from('ClassSubject')
      .select(CLASS_SUBJECT_SELECT)
      .eq('tenantId', tenantId)
      .in('classId', yearClassIds),
    supabase
      .from('ClassSubjectSubBranch')
      .select('subjectId, subjectSubBranchId')
      .eq('tenantId', tenantId)
      .in('classId', yearClassIds),
    supabase
      .from('StudentEnrollment')
      .select('studentProfileId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('classId', resolvedClassId)
      .eq('status', 'ENROLLED'),
    fetchAcadiaTenant(supabase, tenantId),
    fetchStudentTermDiscipline(
      supabase,
      tenantId,
      studentProfileId,
      academicYearId,
    ),
    supabase
      .from('StaffClassSubjectAssignment')
      .select(SUBJECT_TEACHER_SELECT)
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('classId', resolvedClassId),
  ]);

  let legacyUserResult: {
    gender: string | null;
    date_of_birth: string | null;
    avatar_url: string | null;
  } | null = null;
  try {
    const { data } = await supabase
      .from('users')
      .select('gender, date_of_birth, avatar_url')
      .eq('id', profile.userId)
      .maybeSingle();
    legacyUserResult = data;
  } catch {
    legacyUserResult = null;
  }

  let placeOfBirth = '';
  try {
    const { data: profileLink } = await supabase
      .from('user_profiles')
      .select('role_specific_id')
      .eq('user_id', profile.userId)
      .maybeSingle();
    const legacyStudentId = (profileLink?.role_specific_id as string | null)?.trim();
    if (legacyStudentId) {
      const { data: studentRow } = await supabase
        .from('students')
        .select('place_of_birth')
        .eq('tenant_id', tenantId)
        .eq('student_id', legacyStudentId)
        .maybeSingle();
      placeOfBirth = (studentRow?.place_of_birth as string | null)?.trim() || '';
    }
  } catch {
    placeOfBirth = '';
  }

  if (yearResult.error) {
    throw new Error(getQueryErrorMessage(yearResult.error));
  }
  if (!yearResult.data) {
    throw new Error('Academic year not found.');
  }
  if (sequenceResult.error) {
    throw new Error(getQueryErrorMessage(sequenceResult.error));
  }
  if (classSubjectResult.error) {
    throw new Error(getQueryErrorMessage(classSubjectResult.error));
  }
  if (subBranchResult.error) {
    throw new Error(getQueryErrorMessage(subBranchResult.error));
  }
  if (cohortResult.error) {
    throw new Error(getQueryErrorMessage(cohortResult.error));
  }
  if (teacherResult.error) {
    throw new Error(getQueryErrorMessage(teacherResult.error));
  }

  const teacherNames = new Map<string, string[]>();
  for (const row of (teacherResult.data ?? []) as unknown as Array<{
    subjectId?: string;
    StaffProfile?: unknown;
  }>) {
    const subjectId = row.subjectId?.trim();
    if (!subjectId) {
      continue;
    }
    const staff = unwrapRelation<{ User?: unknown }>(row.StaffProfile);
    const staffUser = unwrapRelation<{ name?: string | null }>(staff?.User);
    const name = staffUser?.name?.trim();
    if (!name) {
      continue;
    }
    const list = teacherNames.get(subjectId) ?? [];
    if (!list.includes(name)) {
      list.push(name);
    }
    teacherNames.set(subjectId, list);
  }

  const structure: AcademicYearStructure = {
    termsPerYear: yearResult.data.termsPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.termsPerYear,
    sequencesPerTerm:
      yearResult.data.sequencesPerTerm ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerTerm,
    sequencesPerYear:
      yearResult.data.sequencesPerYear ?? DEFAULT_ACADEMIC_STRUCTURE.sequencesPerYear,
  };

  const requiredBySubject = new Map<string, string[]>();
  for (const row of subBranchResult.data ?? []) {
    const subjectId = row.subjectId as string;
    const list = requiredBySubject.get(subjectId) ?? [];
    list.push(row.subjectSubBranchId as string);
    requiredBySubject.set(subjectId, list);
  }

  const classSubjectRows = (classSubjectResult.data ?? []) as unknown as Array<{
    classId?: string | null;
    subjectId: string;
    groupingId: string | null;
    forceUngrouped?: boolean;
    Subject?: unknown;
    ClassGrouping?: unknown;
  }>;
  const mappedSubjects = classSubjectRows.flatMap((row) => {
    const subject = unwrapRelation<{
      id?: string;
      nameEn?: string;
      nameFr?: string | null;
      code?: string;
      coefficient?: number;
      subjectType?: string;
      SubjectGrouping?: unknown;
    }>(row.Subject);
    if (!subject?.id) {
      return [];
    }
    const grouping = resolveReportCardGrouping(
      unwrapRelation<ReportCardGroupingRef>(row.ClassGrouping),
      unwrapRelation<ReportCardGroupingRef>(subject.SubjectGrouping),
      { forceUngrouped: Boolean(row.forceUngrouped) },
    );
    return [
      {
        subjectId: subject.id,
        nameEn: subject.nameEn?.trim() || subject.code || subject.id,
        nameFr: subject.nameFr,
        code: subject.code ?? '',
        coefficient: Number(subject.coefficient ?? 1),
        subjectType: subject.subjectType ?? 'OTHERS',
        groupingId: grouping.groupingId,
        groupingLabel: grouping.groupingLabel,
        groupingLabelFr: grouping.groupingLabelFr,
        groupingSortOrder: grouping.groupingSortOrder,
        requiredSubBranchIds: requiredBySubject.get(subject.id) ?? [],
        teacherName: (teacherNames.get(subject.id) ?? []).join(', ') || undefined,
        fromCurrentClass: row.classId === resolvedClassId,
      },
    ];
  });
  const subjectsById = new Map<string, ReportCardSubjectDef>();
  for (const row of mappedSubjects) {
    const existing = subjectsById.get(row.subjectId);
    if (!existing || row.fromCurrentClass) {
      const { fromCurrentClass: _fromCurrentClass, ...subject } = row;
      subjectsById.set(row.subjectId, subject);
    }
  }
  const subjects = Array.from(subjectsById.values());

  const subjectIds = subjects.map((subject) => subject.subjectId);
  const cohortIds = [
    ...new Set(
      (cohortResult.data ?? [])
        .map((row) => row.studentProfileId as string)
        .filter(Boolean),
    ),
  ];
  if (!cohortIds.includes(studentProfileId)) {
    cohortIds.push(studentProfileId);
  }

  let classMaster = '';
  if (classRow?.staffProfileId) {
    const { data: staffRow, error: staffError } = await supabase
      .from('StaffProfile')
      .select(STAFF_SELECT)
      .eq('tenantId', tenantId)
      .eq('id', classRow.staffProfileId)
      .maybeSingle();
    if (staffError) {
      throw new Error(getQueryErrorMessage(staffError));
    }
    const staff = staffRow as { User?: unknown } | null;
    const staffUser = unwrapRelation<{ name?: string | null }>(staff?.User);
    classMaster = staffUser?.name?.trim() || '';
  }

  const sequenceById = new Map(
    (sequenceResult.data ?? []).map((row) => [
      row.id as string,
      { number: Number(row.number), numberInTerm: Number(row.numberInTerm) },
    ]),
  );

  const marks: ReportCardMarkRow[] = [];
  if (subjectIds.length > 0 && cohortIds.length > 0) {
    const { data: sessions, error: sessionError } = await supabase
      .from('ExamSession')
      .select('id, subjectId, sequenceId, type')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('type', 'NORMAL')
      .in('subjectId', subjectIds);

    if (sessionError) {
      throw new Error(getQueryErrorMessage(sessionError));
    }

    const sessionMeta = new Map(
      (sessions ?? []).map((session) => [
        session.id as string,
        {
          subjectId: session.subjectId as string,
          sequenceNumber: session.sequenceId
            ? (sequenceById.get(session.sequenceId as string)?.number ?? null)
            : null,
        },
      ]),
    );
    const sessionIds = Array.from(sessionMeta.keys());

    for (const sessionChunk of chunkIds(sessionIds)) {
      for (const studentChunk of chunkIds(cohortIds)) {
        const { data: markRows, error: marksError } = await supabase
          .from('SubjectMark')
          .select(MARK_SELECT)
          .eq('tenantId', tenantId)
          .in('examSessionId', sessionChunk)
          .in('studentProfileId', studentChunk);

        if (marksError) {
          throw new Error(getQueryErrorMessage(marksError));
        }

        const typedMarks = (markRows ?? []) as unknown as Array<{
          studentProfileId: string;
          subjectId: string;
          subjectSubBranchId: string | null;
          totalScore: number | null;
          examSessionId: string;
          Subject?: unknown;
          SubjectSubBranch?: unknown;
        }>;

        for (const mark of typedMarks) {
          const meta = sessionMeta.get(mark.examSessionId as string);
          if (!meta) {
            continue;
          }
          const subject = unwrapRelation<{ coefficient?: number | null }>(mark.Subject);
          const subBranch = unwrapRelation<{ coefficient?: number | null }>(
            mark.SubjectSubBranch,
          );
          marks.push({
            studentProfileId: mark.studentProfileId as string,
            subjectId: mark.subjectId as string,
            subjectSubBranchId: (mark.subjectSubBranchId as string | null) ?? null,
            totalScore:
              mark.totalScore != null ? Number(mark.totalScore) : null,
            sequenceNumber: meta.sequenceNumber,
            subjectCoefficient:
              subject?.coefficient != null ? Number(subject.coefficient) : 1,
            subBranchCoefficient:
              subBranch?.coefficient != null ? Number(subBranch.coefficient) : null,
          });
        }
      }
    }
  }

  const user = unwrapRelation<{ id?: string; name?: string | null; avatar?: string | null }>(
    profile.User,
  );
  const { first, last } = splitStudentName(user?.name);
  const legacy = legacyUserResult;
  const dob = formatDob((legacy?.date_of_birth as string | null) ?? null);
  const sex = formatSex(legacy?.gender as string | null);
  const logoUrl = resolveReportCardLogoUrl(tenant);
  const reportCardLogoUrl = getTenantAssetPublicUrl(tenant?.reportCardLogoStorageKey);
  const letterhead = resolveReportCardLetterhead(tenant);

  return {
    student: {
      studentProfileId,
      name: user?.name?.trim() || `${first} ${last}`.trim() || 'Student',
      firstName: first,
      lastName: last,
      matricule:
        (profile.matriculeNumber as string | null)?.trim() ||
        (profile.registrationNumber as string) ||
        '',
      sex,
      dob,
      pob: placeOfBirth || '—',
      photoUrl:
        (user?.avatar as string | null) ??
        (legacy?.avatar_url as string | null) ??
        undefined,
      speciality: branchLabel(
        (classRow?.branch as string | null) ?? (enrollment?.branch as string | null),
      ),
      isRepeater: enrollment?.isRepeater === true,
    },
    classId: resolvedClassId,
    className: classRow?.name?.trim() || '—',
    classMaster,
    classSize: cohortIds.length,
    academicYearLabel: yearResult.data.label,
    structure,
    subjects,
    marks,
    disciplineByTerm,
    preferFrenchNames: classRow?.subSystem === 'FRENCH',
    transferredFrom,
    branding: {
      ...resolveReportCardInstitutionNames(tenant),
      logoUrl,
      reportCardLogoUrl,
      contactLine: letterhead.contactLine || '—',
      ministryEn: letterhead.ministryEn,
      ministryFr: letterhead.ministryFr,
      regionEn: letterhead.regionEn,
      regionFr: letterhead.regionFr,
      regionalDelegationEn: letterhead.regionalDelegationEn,
      regionName: letterhead.regionName,
      divisionalDelegation: letterhead.divisionalDelegation,
      divisionalDelegationFr: letterhead.divisionalDelegationFr,
      addressLine: letterhead.addressLine,
      poBox: letterhead.poBox,
      phone: letterhead.phone,
      principalName: tenant?.secondaryContactName?.trim() || '',
    },
  };
}

export async function loadStudentReportCard(
  supabase: SupabaseClient,
  tenantId: string,
  studentProfileId: string,
  academicYearId: string,
  term: ReportCardTerm,
  classId?: string | null,
): Promise<ReportCardData> {
  const [bundle, preference] = await Promise.all([
    fetchReportCardBundle(
      supabase,
      tenantId,
      studentProfileId,
      academicYearId,
      classId,
    ),
    fetchReportCardTemplatePreference(supabase, tenantId, academicYearId),
  ]);
  return {
    ...buildReportCardData(bundle, term),
    templateId: resolveReportCardTemplate(preference, term),
  };
}
