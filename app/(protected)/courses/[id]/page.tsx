'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { CourseAssignmentPanel } from '@/components/acadia/courses/course-assignment-panel';
import { CourseMaterialsPanel } from '@/components/acadia/courses/course-materials-panel';
import { CourseTimetablePanel } from '@/components/acadia/courses/course-timetable-panel';
import { TimetableSlotFormDialog } from '@/components/acadia/timetable/timetable-slot-form-dialog';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canEditCourse } from '@/lib/acadia/course';
import { canWriteRegistry } from '@/lib/acadia/roles';
import {
  formatDateTime,
  formatRecordValue,
  levelLabel,
  termLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

const COURSE_SELECT = `
  id,
  code,
  nameEn,
  nameFr,
  credits,
  hours,
  deactivatedAt,
  createdAt,
  updatedAt,
  Specialty:specialtyId ( code, nameEn, nameFr ),
  Level:levelId ( number, labelEn ),
  Term:termId ( number )
`;

type CourseDetail = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  credits: number;
  hours: number;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Specialty: unknown;
  Level: unknown;
  Term: unknown;
};

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);

  const { data, isLoading, isError, error } = useSupabaseRecord<CourseDetail>(
    'Course',
    id,
    COURSE_SELECT,
  );

  const specialty = unwrapRelation<{ code?: string; nameEn?: string }>(
    data?.Specialty,
  );
  const level = unwrapRelation<{ number?: number; labelEn?: string }>(data?.Level);
  const term = unwrapRelation<{ number?: number }>(data?.Term);

  const isActive = data ? canEditCourse(data.deactivatedAt) : false;
  const title = data?.code ? `Course — ${data.code}` : 'Course detail';

  return (
    <RecordDetailShell
      title={title}
      description="Course catalog, teacher assignments, materials, and timetable."
      backHref="/courses"
      backLabel="Back to courses"
      isLoading={isLoading}
      isError={isError}
      error={error}
    >
      {data ? (
        <Tabs defaultValue="overview" className="w-full">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="timetable">Timetable</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-2">
              {canManage && isActive ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/courses/${id}/edit`}>
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlotDialogOpen(true)}
                >
                  Add timetable slot
                </Button>
              ) : null}
            </div>
          </div>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
              <RecordDetailCard
                title="Course"
                fields={[
                  { label: 'Code', value: formatRecordValue(data.code) },
                  { label: 'Name (EN)', value: formatRecordValue(data.nameEn) },
                  { label: 'Name (FR)', value: formatRecordValue(data.nameFr) },
                  { label: 'Credits', value: formatRecordValue(data.credits) },
                  { label: 'Hours', value: formatRecordValue(data.hours) },
                  {
                    label: 'Status',
                    value: (
                      <Badge
                        variant={isActive ? 'success' : 'secondary'}
                        appearance="light"
                      >
                        {isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    ),
                  },
                  {
                    label: 'Deactivated at',
                    value: formatDateTime(data.deactivatedAt),
                  },
                  { label: 'Created', value: formatDateTime(data.createdAt) },
                  { label: 'Updated', value: formatDateTime(data.updatedAt) },
                ]}
              />
              <RecordDetailCard
                title="Academic placement"
                fields={[
                  { label: 'Specialty', value: specialtyLabel(specialty) },
                  { label: 'Level', value: levelLabel(level) },
                  { label: 'Term', value: termLabel(term) },
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="teachers">
            <CourseAssignmentPanel courseId={id} canManage={canManage} />
          </TabsContent>
          <TabsContent value="materials">
            <CourseMaterialsPanel courseId={id} canManage={canManage} />
          </TabsContent>
          <TabsContent value="timetable">
            <CourseTimetablePanel courseId={id} canManage={canManage} />
          </TabsContent>
        </Tabs>
      ) : null}

      {canManage ? (
        <TimetableSlotFormDialog
          open={slotDialogOpen}
          onOpenChange={setSlotDialogOpen}
          defaultCourseId={id}
        />
      ) : null}
    </RecordDetailShell>
  );
}
