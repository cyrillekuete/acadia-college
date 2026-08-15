'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SubjectForm } from '@/components/acadia/subjects/subject-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { suggestVariantCode } from '@/lib/acadia/subject-variants';
import type { SubjectFormValues } from '@/lib/acadia/subject-schemas';
import { useTranslation } from '@/hooks/useTranslation';

const VARIANT_SOURCE_SELECT = `
  id,
  code,
  nameEn,
  subSystem,
  branch,
  academicYearId,
  groupingId,
  coefficient
`;

type VariantSource = {
  id: string;
  code: string;
  nameEn: string;
  subSystem: string;
  branch: string;
  academicYearId: string | null;
  groupingId: string | null;
  coefficient: number;
};

export default function NewSubjectPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantOf = searchParams.get('variantOf')?.trim() || undefined;
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const sourceQuery = useSupabaseRecord<VariantSource>(
    'Subject',
    variantOf,
    VARIANT_SOURCE_SELECT,
  );

  const source = variantOf ? sourceQuery.data : undefined;
  const variantLoading = Boolean(variantOf) && sourceQuery.isLoading;
  const initialValues: Partial<SubjectFormValues> | undefined = source
    ? {
        nameEn: source.nameEn,
        code: suggestVariantCode(source.code, [source.code]),
        academicYearId: source.academicYearId ?? '',
        subSystem: source.subSystem as SubjectFormValues['subSystem'],
        branch: source.branch as SubjectFormValues['branch'],
        groupingId: source.groupingId ?? '',
        coefficient: source.coefficient,
        levelIds: [],
        hasSubBranches: false,
        subBranches: [],
      }
    : undefined;

  return (
    <AcadiaPageShell
      title={variantOf ? 'New level variant' : t('subjects.newTitle')}
      description={
        variantOf
          ? 'Create another offering of this subject for a different cycle, coefficient, or sub-branches.'
          : 'Add a subject to the catalog for all terms in the academic year.'
      }
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href={variantOf ? `/subjects/${variantOf}` : '/subjects'}>
            <ArrowLeft className="size-4" />
            {variantOf ? 'Back to subject' : 'Back to subjects'}
          </Link>
        </Button>
      </div>
      {isLoading || variantLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !canManage ? (
        <p className="text-sm text-muted-foreground">
          You do not have permission to create subjects.
        </p>
      ) : variantOf && sourceQuery.isError ? (
        <p className="text-sm text-destructive">
          {sourceQuery.error instanceof Error
            ? sourceQuery.error.message
            : 'Could not load the subject to copy.'}
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('subjects.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectForm
              key={source?.id ?? 'new'}
              initialValues={initialValues}
              copyAssignmentsFromSubjectId={source?.id}
              variantMode={Boolean(source)}
              onCancelHref={variantOf ? `/subjects/${variantOf}` : '/subjects'}
              onCreated={(id) => router.push(`/subjects/${id}`)}
            />
          </CardContent>
        </Card>
      )}
    </AcadiaPageShell>
  );
}
