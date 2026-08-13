'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  EnrollmentApplicationForm,
  type EnrollmentApplicationRecord,
} from '@/components/acadia/enrollment/enrollment-application-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { canEditEnrollmentApplication } from '@/lib/acadia/enrollment';
import { useTranslation } from '@/hooks/useTranslation';

const APPLICATION_SELECT = `
  id,
  kind,
  status,
  firstNameEn,
  lastNameEn,
  firstNameFr,
  lastNameFr,
  email,
  phone,
  dateOfBirth,
  preferredLocale,
  studentProfileId,
  subSystem,
  branch,
  levelId,
  academicYearId
`;

export default function EditEnrollmentApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const { data, isLoading, isError, error } =
    useSupabaseRecord<EnrollmentApplicationRecord>(
      'EnrollmentApplication',
      id,
      APPLICATION_SELECT,
    );

  const editable = data ? canEditEnrollmentApplication(data.status) : false;

  return (
    <AcadiaPageShell
      title={t('enrollment.editApplication')}
      description="Update a pending application before review."
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/enrollment/applications/${id}`}>
            <ArrowLeft className="size-4" />
            Back to application
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{String(error)}</p>
      ) : data && editable ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('enrollment.applicationDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrollmentApplicationForm
              record={data}
              onCancelHref={`/enrollment/applications/${id}`}
            />
          </CardContent>
        </Card>
      ) : data ? (
        <p className="text-sm text-muted-foreground">
          Only pending applications can be edited.
        </p>
      ) : null}
    </AcadiaPageShell>
  );
}
