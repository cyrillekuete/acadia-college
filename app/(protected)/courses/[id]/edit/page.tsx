'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  CourseForm,
  type CourseFormRecord,
} from '@/components/acadia/courses/course-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { canEditCourse } from '@/lib/acadia/course';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { unwrapRelation } from '@/lib/acadia/record-display';

const COURSE_EDIT_SELECT = `
  id,
  code,
  nameEn,
  nameFr,
  credits,
  hours,
  specialtyId,
  levelId,
  termId,
  deactivatedAt,
  Specialty:specialtyId ( subSystem, branch ),
  Term:termId ( academicYearId )
`;

type CourseEditDetail = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  credits: number;
  hours: number;
  specialtyId: string;
  levelId: string;
  termId: string;
  deactivatedAt: string | null;
  Specialty: unknown;
  Term: unknown;
};

export default function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSupabaseRecord<CourseEditDetail>(
    'Course',
    id,
    COURSE_EDIT_SELECT,
  );

  const specialty = unwrapRelation<{ subSystem?: string; branch?: string }>(
    data?.Specialty,
  );
  const term = unwrapRelation<{ academicYearId?: string }>(data?.Term);

  const record: CourseFormRecord | null =
    data && specialty?.subSystem && specialty?.branch && term?.academicYearId
      ? {
          id: data.id,
          code: data.code,
          nameEn: data.nameEn,
          nameFr: data.nameFr,
          credits: data.credits,
          hours: data.hours,
          specialtyId: data.specialtyId,
          levelId: data.levelId,
          termId: data.termId,
          subSystem: specialty.subSystem,
          branch: specialty.branch,
          academicYearId: term.academicYearId,
        }
      : null;

  return (
    <AcadiaPageShell
      title="Edit course"
      description="Update course catalog entry and academic placement."
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/courses/${id}`}>
            <ArrowLeft className="size-4" />
            Back to course
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{String(error)}</p>
      ) : data && canEditCourse(data.deactivatedAt) && record ? (
        <Card>
          <CardHeader>
            <CardTitle>Course details</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm record={record} onCancelHref={`/courses/${id}`} />
          </CardContent>
        </Card>
      ) : data ? (
        <p className="text-sm text-muted-foreground">
          Deactivated courses cannot be edited.
        </p>
      ) : null}
    </AcadiaPageShell>
  );
}
