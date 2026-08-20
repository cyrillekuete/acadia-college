'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/lib/icons';
import {
  SubjectForm,
  type SubjectFormRecord,
} from '@/components/acadia/subjects/subject-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import type { SubjectType } from '@/lib/acadia/subject-catalog';
import { canEditSubject } from '@/lib/acadia/subject';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

const SUBJECT_EDIT_SELECT = `
  id,
  code,
  nameEn,
  nameFr,
  credits,
  hours,
  subSystem,
  branch,
  levelId,
  academicYearId,
  termId,
  subjectType,
  coefficient,
  groupingId,
  hasSubBranches,
  deactivatedAt,
  Term!Subject_semesterId_tenantId_fkey ( academicYearId ),
  SubjectSubBranch ( id, name, nameFr, coefficient, sortOrder ),
  SubjectLevel ( levelId )
`;

type SubjectEditDetail = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  credits: number;
  hours: number;
  subSystem: string;
  branch: string;
  levelId: string;
  academicYearId: string | null;
  termId: string | null;
  SubjectLevel?: { levelId: string }[];
  subjectType: SubjectType;
  coefficient: number;
  groupingId: string | null;
  hasSubBranches: boolean;
  deactivatedAt: string | null;
  Term: unknown;
  SubjectSubBranch?: {
    id: string;
    name: string;
    nameFr: string | null;
    coefficient: number | null;
    sortOrder: number;
  }[];
};

export default function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading } = useAcadiaCollegeSession();
  const canManage = canWriteAcademicAdmin(session?.roleSlug);
  const { data, isLoading, isError, error } = useSupabaseRecord<SubjectEditDetail>(
    'Subject',
    id,
    SUBJECT_EDIT_SELECT,
  );

  const term = unwrapRelation<{ academicYearId?: string }>(data?.Term);

  const subBranches = [...(data?.SubjectSubBranch ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const academicYearId =
    data?.academicYearId ?? term?.academicYearId ?? null;
  const levelIdsFromJunction = (data?.SubjectLevel ?? []).map((sl) => sl.levelId);
  const levelIds =
    levelIdsFromJunction.length > 0
      ? levelIdsFromJunction
      : data?.levelId
        ? [data.levelId]
        : [];

  const record: SubjectFormRecord | null =
    data && data.subSystem && data.branch && academicYearId
      ? {
          id: data.id,
          code: data.code,
          nameEn: data.nameEn,
          nameFr: data.nameFr,
          levelIds,
          subSystem: data.subSystem,
          branch: data.branch,
          academicYearId,
          subjectType: data.subjectType,
          coefficient: data.coefficient,
          groupingId: data.groupingId,
          hasSubBranches: data.hasSubBranches,
          subBranches: subBranches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            hasCustomCoefficient: branch.coefficient != null,
            coefficient: branch.coefficient ?? undefined,
          })),
        }
      : null;

  return (
    <AcadiaPageShell
      title={t('subjects.editTitle')}
      description="Update subject catalog entry and academic placement."
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/subjects/${id}`}>
            <ArrowLeft className="size-4" />
            Back to subject
          </Link>
        </Button>
      </div>
      {isLoading || sessionLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{String(error)}</p>
      ) : !canManage ? (
        <p className="text-sm text-muted-foreground">
          You do not have permission to edit subjects.
        </p>
      ) : data && canEditSubject(data.deactivatedAt) && record ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('subjects.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectForm record={record} onCancelHref={`/subjects/${id}`} />
          </CardContent>
        </Card>
      ) : data && data.deactivatedAt ? (
        <p className="text-sm text-muted-foreground">
          Deactivated subjects cannot be edited.
        </p>
      ) : data ? (
        <p className="text-sm text-muted-foreground">
          This subject is missing a sub-system, branch, or academic year, so it
          cannot be edited until those fields are repaired.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Subject not found.</p>
      )}
    </AcadiaPageShell>
  );
}
