import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_ACADEMIC_STRUCTURE,
  type AcademicYearStructure,
} from '@/lib/acadia/academic-calendar';
import type { ClassReportBundle, ClassReportStudent } from '@/lib/acadia/class-report';
import { uniqueIds } from '@/lib/acadia/staff-class-assignments';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { unwrapRelation } from '@/lib/acadia/record-display';
import {
  resolveReportCardGrouping,
  type ReportCardGroupingRef,
  type ReportCardMarkRow,
  type ReportCardSubjectDef,
} from '@/lib/acadia/report-card';
import { resolveReportCardInstitutionNames } from '@/lib/acadia/report-card-types';
import { splitStudentName } from '@/lib/supabase/queries/student-query-helpers';
import { fetchAcadiaTenant } from '@/lib/supabase/queries/tenant';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { resolveReportCardLogoUrl } from '@/lib/supabase/storage';

const STUDENT_PROFILE_SELECT = `
  id,
  matriculeNumber,
  registrationNumber,
  ${embed('User', FK.StudentProfile_user, 'id, name')}
`;

const CLASS_SUBJECT_SELECT = `
  subjectId,
  groupingId,
  ${embed(
    'Subject',
    FK.ClassSubject_subject,
    [
      'id, nameEn, nameFr, code, coefficient, subjectType, hasSubBranches',
      embed('SubjectGrouping', FK.Subject_grouping, 'id, nameEn, sortOrder'),
    ].join(', '),
  )},
  ClassGrouping:${embed('SubjectGrouping', FK.ClassSubject_grouping, 'id, nameEn, sortOrder')}
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

function chunkIds<T>(ids: T[], size = 200): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export async function fetchClassMasterAccessibleClassIds(
  supabase: SupabaseClient,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<string[]> {
  const [classResult, assignmentResult] = await Promise.all([
    supabase
      .from('Class')
      .select('id')
      .eq('tenantId', tenantId)
      .eq('staffProfileId', staffProfileId),
    supabase
      .from('StaffClassAssignment')
      .select('classId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('staffProfileId', staffProfileId),
  ]);

  if (classResult.error) {
    throw classResult.error;
  }
  if (assignmentResult.error) {
    throw assignmentResult.error;
  }

  return uniqueIds([
    ...((classResult.data ?? []) as Array<{ id?: string | null }>).map((row) => row.id ?? ''),
    ...((assignmentResult.data ?? []) as Array<{ classId?: string | null }>).map(
      (row) => row.classId ?? '',
    ),
  ]);
}

export async function fetchClassReportBundle(
  supabase: SupabaseClient,
  tenantId: string,
  classId: string,
  academicYearId: string,
): Promise<ClassReportBundle> {
  const trimmedClassId = classId.trim();
  if (!trimmedClassId) {
    throw new Error('Class is required.');
  }

  const [
    classResult,
    yearResult,
    sequenceResult,
    classSubjectResult,
    subBranchResult,
    cohortResult,
    tenant,
  ] = await Promise.all([
    supabase
      .from('Class')
      .select('id, name, staffProfileId, branch')
      .eq('tenantId', tenantId)
      .eq('id', trimmedClassId)
      .maybeSingle(),
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
      .eq('classId', trimmedClassId),
    supabase
      .from('ClassSubjectSubBranch')
      .select('subjectId, subjectSubBranchId')
      .eq('tenantId', tenantId)
      .eq('classId', trimmedClassId),
    supabase
      .from('StudentEnrollment')
      .select('studentProfileId')
      .eq('tenantId', tenantId)
      .eq('academicYearId', academicYearId)
      .eq('classId', trimmedClassId)
      .eq('status', 'ENROLLED'),
    fetchAcadiaTenant(supabase, tenantId),
  ]);

  if (classResult.error) {
    throw new Error(getQueryErrorMessage(classResult.error));
  }
  if (!classResult.data) {
    throw new Error('Class not found.');
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

  const classRow = classResult.data as {
    id: string;
    name: string | null;
    staffProfileId: string | null;
    branch: string | null;
  };

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
    subjectId: string;
    groupingId: string | null;
    Subject?: unknown;
    ClassGrouping?: unknown;
  }>;
  const subjects: ReportCardSubjectDef[] = classSubjectRows.flatMap((row) => {
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
        groupingSortOrder: grouping.groupingSortOrder,
        requiredSubBranchIds: requiredBySubject.get(subject.id) ?? [],
      },
    ];
  });

  const cohortIds = [
    ...new Set(
      (cohortResult.data ?? [])
        .map((row) => row.studentProfileId as string)
        .filter(Boolean),
    ),
  ];

  const profileById = new Map<
    string,
    { name: string; matricule: string }
  >();
  for (const chunk of chunkIds(cohortIds)) {
    if (chunk.length === 0) {
      continue;
    }
    const { data: profileRows, error: profileError } = await supabase
      .from('StudentProfile')
      .select(STUDENT_PROFILE_SELECT)
      .eq('tenantId', tenantId)
      .in('id', chunk);
    if (profileError) {
      throw new Error(getQueryErrorMessage(profileError));
    }
    for (const row of (profileRows ?? []) as Array<{
      id: string;
      matriculeNumber: string | null;
      registrationNumber: string;
      User?: unknown;
    }>) {
      const user = unwrapRelation<{ name?: string | null }>(row.User);
      const { first, last } = splitStudentName(user?.name);
      profileById.set(row.id, {
        name: user?.name?.trim() || `${first} ${last}`.trim() || 'Student',
        matricule:
          row.matriculeNumber?.trim() || row.registrationNumber || '',
      });
    }
  }

  const students: ClassReportStudent[] = cohortIds
    .map((studentProfileId) => {
      const profile = profileById.get(studentProfileId);
      return {
        studentProfileId,
        name: profile?.name ?? 'Student',
        matricule: profile?.matricule ?? '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let classMaster = '';
  if (classRow.staffProfileId) {
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

  const subjectIds = subjects.map((subject) => subject.subjectId);
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
          const meta = sessionMeta.get(mark.examSessionId);
          if (!meta) {
            continue;
          }
          const subject = unwrapRelation<{ coefficient?: number | null }>(mark.Subject);
          const subBranch = unwrapRelation<{ coefficient?: number | null }>(
            mark.SubjectSubBranch,
          );
          marks.push({
            studentProfileId: mark.studentProfileId,
            subjectId: mark.subjectId,
            subjectSubBranchId: mark.subjectSubBranchId ?? null,
            totalScore: mark.totalScore != null ? Number(mark.totalScore) : null,
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

  const logoUrl = resolveReportCardLogoUrl(tenant);
  const addressParts = [
    tenant?.addressLine1,
    tenant?.addressLine2,
    tenant?.city,
  ].filter((part) => part && part.trim());
  const contactLine = [
    addressParts.join(', '),
    tenant?.institutionPhone ? `Tel: ${tenant.institutionPhone}` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const region = tenant?.region?.trim() || 'Littoral';

  return {
    classId: classRow.id,
    className: classRow.name?.trim() || '—',
    classMaster,
    academicYearLabel: yearResult.data.label,
    structure,
    subjects,
    marks,
    students,
    branding: {
      ...resolveReportCardInstitutionNames(tenant),
      logoUrl,
      contactLine: contactLine || '—',
      regionEn: `Regional Delegation of ${region}`,
      regionFr: `Délégation Régionale de ${region}`,
      principalName: tenant?.secondaryContactName?.trim() || '',
    },
  };
}
