'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Pencil } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { SubjectAssignmentPanel } from '@/components/acadia/subjects/subject-assignment-panel';
import { SubjectMaterialsPanel } from '@/components/acadia/subjects/subject-materials-panel';
import { SubjectTimetablePanel } from '@/components/acadia/subjects/subject-timetable-panel';
import { TimetableSlotFormDialog } from '@/components/acadia/timetable/timetable-slot-form-dialog';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canEditSubject } from '@/lib/acadia/subject';
import { canWriteRegistry } from '@/lib/acadia/roles';
import {
  formatDateTime,
  formatRecordValue,
  levelLabel,
  termLabel,
  specialtyLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

import {
  formatSubBranchNames,
  subjectTypeLabel,
} from '@/lib/acadia/subject-catalog';
import type { SubjectType } from '@/lib/acadia/subject-catalog';

const SUBJECT_SELECT = `
  id,
  code,
  nameEn,
  nameFr,
  credits,
  hours,
  subjectType,
  coefficient,
  hasSubBranches,
  deactivatedAt,
  createdAt,
  updatedAt,
  Specialty:specialtyId ( code, nameEn, nameFr ),
  Level:levelId ( number, labelEn ),
  Term:termId ( number ),
  SubjectGrouping:groupingId ( nameEn, nameFr ),
  SubjectSubBranch ( name, nameFr, coefficient, sortOrder )
`;

type SubjectDetail = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  credits: number;
  hours: number;
  subjectType: SubjectType;
  coefficient: number;
  hasSubBranches: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Specialty: unknown;
  Level: unknown;
  Term: unknown;
  SubjectGrouping: unknown;
  SubjectSubBranch?: { name: string; nameFr: string | null; sortOrder: number }[];
};

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);

  const { data, isLoading, isError, error } = useSupabaseRecord<SubjectDetail>(
    'Subject',
    id,
    SUBJECT_SELECT,
  );

  const specialty = unwrapRelation<{ code?: string; nameEn?: string }>(
    data?.Specialty,
  );
  const level = unwrapRelation<{ number?: number; labelEn?: string }>(data?.Level);
  const term = unwrapRelation<{ number?: number }>(data?.Term);
  const grouping = unwrapRelation<{ nameEn?: string; nameFr?: string }>(
    data?.SubjectGrouping,
  );
  const subBranches = [...(data?.SubjectSubBranch ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const isActive = data ? canEditSubject(data.deactivatedAt) : false;
  const title = data?.code ? `Subject — ${data.code}` : 'Subject detail';

  return (
    <RecordDetailShell
      title={title}
      description="Subject catalog, teacher assignments, materials, and timetable."
      backHref="/subjects"
      backLabel="Back to subjects"
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
                  <Link href={`/subjects/${id}/edit`}>
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
                title="Subject"
                fields={[
                  { label: 'Code', value: formatRecordValue(data.code) },
                  { label: 'Name (EN)', value: formatRecordValue(data.nameEn) },
                  { label: 'Name (FR)', value: formatRecordValue(data.nameFr) },
                  { label: 'Credits', value: formatRecordValue(data.credits) },
                  { label: 'Hours', value: formatRecordValue(data.hours) },
                  { label: 'Type', value: subjectTypeLabel(data.subjectType) },
                  { label: 'Coefficient', value: formatRecordValue(data.coefficient) },
                  {
                    label: 'Grouping',
                    value: formatRecordValue(grouping?.nameEn),
                  },
                  {
                    label: 'Sub-branches',
                    value: formatSubBranchNames(subBranches, 10),
                  },
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
            <SubjectAssignmentPanel subjectId={id} canManage={canManage} />
          </TabsContent>

          <TabsContent value="materials">
            <SubjectMaterialsPanel subjectId={id} canManage={canManage} />
          </TabsContent>

          <TabsContent value="timetable">
            <SubjectTimetablePanel subjectId={id} canManage={canManage} />
          </TabsContent>
        </Tabs>
      ) : null}

      {canManage ? (
        <TimetableSlotFormDialog
          open={slotDialogOpen}
          onOpenChange={setSlotDialogOpen}
          defaultSubjectId={id}
        />
      ) : null}
    </RecordDetailShell>
  );
}
