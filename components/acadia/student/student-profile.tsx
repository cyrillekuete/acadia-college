'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/helpers';
import {
  getStudentFullName,
  type StudentListItem,
} from '@/lib/acadia/student-list-item';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { getStudentEnrollmentStatusProps } from '@/components/acadia/student/student-list-status';

export function StudentProfile({
  student,
  isLoading,
}: {
  student: StudentListItem | undefined;
  isLoading: boolean;
}) {
  const { data: session } = useAcadiaCollegeSession();
  const canEdit = canWriteRegistry(session?.roleSlug);

  if (isLoading || !student) {
    return (
      <Card>
        <CardContent>
          <dl className="mb-5 grid grid-cols-[auto_1fr] gap-3 text-sm text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="col-span-2 grid grid-cols-subgrid items-baseline">
                <dt>
                  <Skeleton className="h-5 w-24" />
                </dt>
                <dd>
                  <Skeleton className="h-5 w-36" />
                </dd>
              </div>
            ))}
          </dl>
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
    );
  }

  const fullName = getStudentFullName(student);
  const statusProps = getStudentEnrollmentStatusProps(student.enrollment_status);
  const statusVariant = statusProps.variant as keyof BadgeProps['variant'];

  return (
    <Card>
      <CardContent>
        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-3 text-sm [&_dt]:text-muted-foreground">
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt className="flex md:w-64">Full name:</dt>
            <dd>{fullName || 'Not available'}</dd>
          </div>
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt>Email address:</dt>
            <dd className="flex items-center gap-2.5">
              <span>{student.email}</span>
              {student.email_verified ? (
                <Badge variant="secondary" appearance="light">
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning" appearance="light">
                  Not verified
                </Badge>
              )}
            </dd>
          </div>
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt>Class:</dt>
            <dd>
              <span className="inline-flex items-center gap-1">
                {student.class_name}
                <Badge variant="outline">Current</Badge>
              </span>
            </dd>
          </div>
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt>Status:</dt>
            <dd>
              <Badge variant={statusVariant} appearance="ghost">
                <BadgeDot />
                {statusProps.label}
              </Badge>
            </dd>
          </div>
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt>Student ID:</dt>
            <dd>{student.registration_number ?? student.student_id ?? '—'}</dd>
          </div>
          {student.matricule_number ? (
            <div className="col-span-2 grid grid-cols-subgrid items-baseline">
              <dt>Matricule:</dt>
              <dd>{student.matricule_number}</dd>
            </div>
          ) : null}
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt>Enrolled:</dt>
            <dd>
              {student.enrollment_date
                ? formatDate(new Date(student.enrollment_date))
                : '—'}
            </dd>
          </div>
        </dl>
        {canEdit ? (
          <Button variant="outline" asChild>
            <Link href={`/students/${student.id}/edit`}>Edit student details</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Edit student details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
