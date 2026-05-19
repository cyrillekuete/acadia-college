'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useSupabaseTableList } from '@/hooks/use-supabase-table-list';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { formatDateTime, formatRecordValue } from '@/lib/acadia/record-display';

const STUDENT_SELECT = `
  id,
  student_id,
  first_name,
  last_name,
  middle_name,
  email,
  phone,
  date_of_birth,
  gender,
  place_of_birth,
  nationality,
  religion,
  address,
  city,
  region,
  subsystem,
  branch,
  class_name,
  class_id,
  previous_school,
  previous_class,
  is_new_student,
  academic_year,
  enrollment_date,
  matricule_number,
  enrollment_status,
  status,
  created_at,
  updated_at
`;

type StudentDetail = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  place_of_birth: string | null;
  nationality: string | null;
  religion: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  subsystem: string | null;
  branch: string | null;
  class_name: string | null;
  class_id: string | null;
  previous_school: string | null;
  previous_class: string | null;
  is_new_student: boolean | null;
  academic_year: string | null;
  enrollment_date: string | null;
  matricule_number: string | null;
  enrollment_status: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type ParentRow = {
  id: string;
  parent_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  occupation: string | null;
  address: string | null;
  student_id: string;
};

function ParentsCard({ studentIdKey }: { studentIdKey: string }) {
  const { data: session, isLoading: sessionLoading } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const parentFilters = useMemo(
    () => [{ column: 'student_id', value: studentIdKey }],
    [studentIdKey],
  );

  const { data: parents = [], isLoading, isError } = useSupabaseTableList<ParentRow>(
    'parents',
    'id, parent_code, name, email, phone, relationship, occupation, address, student_id',
    'tenant_id',
    parentFilters,
  );

  if (isLoading || sessionLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Parent / Guardian</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading…</p></CardContent>
      </Card>
    );
  }

  if (isError || !tenantId) {
    return (
      <Card>
        <CardHeader><CardTitle>Parent / Guardian</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-destructive">Could not load parent records.</p></CardContent>
      </Card>
    );
  }

  if (parents.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Parent / Guardian</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No parent or guardian linked.</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      {parents.map((parent) => (
        <RecordDetailCard
          key={parent.id}
          title={`Parent — ${parent.name}`}
          fields={[
            { label: 'Code', value: formatRecordValue(parent.parent_code) },
            { label: 'Relationship', value: formatRecordValue(parent.relationship) },
            { label: 'Email', value: formatRecordValue(parent.email) },
            { label: 'Phone', value: formatRecordValue(parent.phone) },
            { label: 'Occupation', value: formatRecordValue(parent.occupation) },
            { label: 'Address', value: formatRecordValue(parent.address) },
          ]}
        />
      ))}
    </>
  );
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);

  const { data, isLoading, isError, error } = useSupabaseRecord<StudentDetail>(
    'students',
    id,
    STUDENT_SELECT,
    'tenant_id',
  );

  const fullName = data
    ? [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ')
    : 'Student profile';

  const title = data?.student_id ? `Student — ${data.student_id}` : 'Student profile';

  return (
    <RecordDetailShell
      title={title}
      description="Student record, guardian details, and academic information."
      backHref="/students"
      backLabel="Back to students"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data && (
        <Tabs defaultValue="overview" className="w-full">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contact">Contact &amp; location</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="parents">Parents / Guardians</TabsTrigger>
            </TabsList>
            {canManage && (
              <Link
                href={`/students/${id}/edit`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Edit student
              </Link>
            )}
          </div>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
              <RecordDetailCard
                title="Identity"
                fields={[
                  { label: 'Student ID', value: formatRecordValue(data.student_id) },
                  { label: 'Full name', value: fullName },
                  { label: 'Gender', value: formatRecordValue(data.gender) },
                  { label: 'Date of birth', value: formatDateTime(data.date_of_birth) },
                  { label: 'Place of birth', value: formatRecordValue(data.place_of_birth) },
                  { label: 'Nationality', value: formatRecordValue(data.nationality) },
                  { label: 'Religion', value: formatRecordValue(data.religion) },
                ]}
              />
              <RecordDetailCard
                title="Enrolment"
                fields={[
                  { label: 'Matricule', value: formatRecordValue(data.matricule_number) },
                  {
                    label: 'Status',
                    value: (
                      <Badge
                        variant={data.enrollment_status === 'active' ? 'success' : data.enrollment_status === 'pending' ? 'warning' : 'secondary'}
                        appearance="light"
                        className="capitalize"
                      >
                        {data.enrollment_status ?? 'pending'}
                      </Badge>
                    ),
                  },
                  { label: 'Academic year', value: formatRecordValue(data.academic_year) },
                  { label: 'Enrolment date', value: formatDateTime(data.enrollment_date) },
                  { label: 'Class', value: formatRecordValue(data.class_name) },
                  { label: 'Subsystem', value: formatRecordValue(data.subsystem) },
                  { label: 'Branch', value: formatRecordValue(data.branch) },
                  { label: 'Created', value: formatDateTime(data.created_at) },
                  { label: 'Updated', value: formatDateTime(data.updated_at) },
                ]}
              />
            </div>
          </TabsContent>

          {/* Contact & location */}
          <TabsContent value="contact">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
              <RecordDetailCard
                title="Contact"
                fields={[
                  { label: 'Email', value: formatRecordValue(data.email) },
                  { label: 'Phone', value: formatRecordValue(data.phone) },
                ]}
              />
              <RecordDetailCard
                title="Location"
                fields={[
                  { label: 'Address', value: formatRecordValue(data.address) },
                  { label: 'City', value: formatRecordValue(data.city) },
                  { label: 'Region', value: formatRecordValue(data.region) },
                ]}
              />
            </div>
          </TabsContent>

          {/* Academic */}
          <TabsContent value="academic">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
              <RecordDetailCard
                title="Academic history"
                fields={[
                  { label: 'Previous school', value: formatRecordValue(data.previous_school) },
                  { label: 'Previous class', value: formatRecordValue(data.previous_class) },
                  {
                    label: 'New student',
                    value: (
                      <Badge variant={data.is_new_student ? 'success' : 'secondary'} appearance="light">
                        {data.is_new_student ? 'Yes' : 'No'}
                      </Badge>
                    ),
                  },
                ]}
              />
            </div>
          </TabsContent>

          {/* Parents / Guardians */}
          <TabsContent value="parents">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
              <ParentsCard studentIdKey={data.student_id} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </RecordDetailShell>
  );
}
