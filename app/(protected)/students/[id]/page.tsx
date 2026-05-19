'use client';

import { use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { StudentAcademicProgress } from '@/components/acadia/student/student-academic-progress';
import { StudentClassMigrationDialog } from '@/components/acadia/student/student-class-migration-dialog';
import { StudentEditForm } from '@/components/acadia/student/student-edit-form';
import { StudentExamsCertificates } from '@/components/acadia/student/student-exams-certificates';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import {
  formatDateTime,
  formatRecordValue,
  levelLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const STUDENT_SELECT = `
  id,
  registrationNumber,
  isActive,
  alumniSince,
  alumniDirectoryOptIn,
  specialtyId,
  createdAt,
  updatedAt,
  User:userId ( id, email, name, status, country, timezone, lastSignInAt ),
  Specialty:specialtyId ( code, nameEn, nameFr, subSystem, branch ),
  Level:currentLevelId ( number, labelEn )
`;

type StudentDetail = {
  id: string;
  registrationNumber: string;
  isActive: boolean;
  alumniSince: string | null;
  alumniDirectoryOptIn: boolean;
  specialtyId: string;
  createdAt: string;
  updatedAt: string;
  User: unknown;
  Specialty: unknown;
  Level: unknown;
};

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);

  const { data, isLoading, isError, error } = useSupabaseRecord<StudentDetail>(
    'StudentProfile',
    id,
    STUDENT_SELECT,
  );

  const user = unwrapRelation<{
    id?: string;
    email?: string;
    name?: string;
    status?: string;
    country?: string;
    timezone?: string;
    lastSignInAt?: string;
  }>(data?.User);

  const specialty = unwrapRelation<{
    code?: string;
    nameEn?: string;
    subSystem?: string;
    branch?: string;
  }>(data?.Specialty);
  const level = unwrapRelation<{ number?: number; labelEn?: string }>(data?.Level);

  const title = data?.registrationNumber
    ? `Student — ${data.registrationNumber}`
    : 'Student profile';

  return (
    <RecordDetailShell
      title={title}
      description="Student registry profile, academic progress, and certificates."
      backHref="/students"
      backLabel="Back to students"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data && user?.id ? (
        <Tabs defaultValue="overview" className="w-full">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Academic progress</TabsTrigger>
              <TabsTrigger value="exams">Exams & certificates</TabsTrigger>
              {canManage ? (
                <TabsTrigger value="edit">Edit profile</TabsTrigger>
              ) : null}
            </TabsList>
            {canManage && specialty?.subSystem && specialty?.branch ? (
              <StudentClassMigrationDialog
                profileId={data.id}
                currentSpecialtyId={data.specialtyId}
                subSystem={specialty.subSystem}
                branch={specialty.branch}
              />
            ) : null}
          </div>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
              <RecordDetailCard
                title="Student"
                fields={[
                  {
                    label: 'Matricule',
                    value: formatRecordValue(data.registrationNumber),
                  },
                  {
                    label: 'Status',
                    value: (
                      <Badge
                        variant={data.isActive ? 'success' : 'secondary'}
                        appearance="light"
                      >
                        {data.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    ),
                  },
                  { label: 'Specialty', value: specialtyLabel(specialty) },
                  { label: 'Current level', value: levelLabel(level) },
                  { label: 'Alumni since', value: formatDateTime(data.alumniSince) },
                  {
                    label: 'Alumni directory',
                    value: formatRecordValue(data.alumniDirectoryOptIn),
                  },
                  { label: 'Created', value: formatDateTime(data.createdAt) },
                  { label: 'Updated', value: formatDateTime(data.updatedAt) },
                ]}
              />
              <RecordDetailCard
                title="Linked user account"
                fields={[
                  { label: 'Name', value: formatRecordValue(user?.name) },
                  { label: 'Email', value: formatRecordValue(user?.email) },
                  {
                    label: 'Account status',
                    value: formatRecordValue(user?.status),
                  },
                  { label: 'Country', value: formatRecordValue(user?.country) },
                  { label: 'Timezone', value: formatRecordValue(user?.timezone) },
                  {
                    label: 'Last sign-in',
                    value: formatDateTime(user?.lastSignInAt),
                  },
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <StudentAcademicProgress studentProfileId={data.id} />
          </TabsContent>

          <TabsContent value="exams">
            <StudentExamsCertificates studentProfileId={data.id} />
          </TabsContent>

          {canManage ? (
            <TabsContent value="edit">
              <Card>
                <CardHeader>
                  <CardTitle>Edit student profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <StudentEditForm
                    student={{
                      profileId: data.id,
                      userId: user.id,
                      registrationNumber: data.registrationNumber,
                      isActive: data.isActive,
                      alumniDirectoryOptIn: data.alumniDirectoryOptIn,
                      alumniSince: data.alumniSince,
                      name: user.name ?? '',
                      email: user.email ?? '',
                      country: user.country ?? null,
                      timezone: user.timezone ?? null,
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}
    </RecordDetailShell>
  );
}
