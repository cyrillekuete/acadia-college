'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  EnrollmentApplicationForm,
  type EnrollmentApplicationRecord,
} from '@/components/acadia/enrollment/enrollment-application-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { canEditEnrollmentApplication } from '@/lib/acadia/enrollment';

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
  specialtyId,
  levelId,
  academicYearId
`;

export default function EditEnrollmentApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } =
    useSupabaseRecord<EnrollmentApplicationRecord>(
      'EnrollmentApplication',
      id,
      APPLICATION_SELECT,
    );

  const editable = data ? canEditEnrollmentApplication(data.status) : false;

  return (
    <AcadiaPageShell
      title="Edit enrollment application"
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
            <CardTitle>Application details</CardTitle>
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
