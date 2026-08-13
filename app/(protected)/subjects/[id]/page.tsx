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
import { SubjectClassAssignmentPanel } from '@/components/acadia/subjects/subject-class-assignment-panel';
import { SubjectMaterialsPanel } from '@/components/acadia/subjects/subject-materials-panel';
import { SubjectTimetablePanel } from '@/components/acadia/subjects/subject-timetable-panel';
import { TimetableSlotFormDialog } from '@/components/acadia/timetable/timetable-slot-form-dialog';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canEditSubject } from '@/lib/acadia/subject';
import { canWriteRegistry, isStudent } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';
import {
  parseAcademicBranch,
  parseAcademicSubSystem,
} from '@/lib/acadia/education-system';
import {
  formatDateTime,
  formatRecordValue,
  levelLabel,
  subjectTermScopeLabel,
  streamLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';

import {
  formatSubBranchDisplayNames,
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
  termId,
  academicYearId,
  deactivatedAt,
  createdAt,
  updatedAt,
  subSystem,
  branch,
  groupingId,
  Level!Subject_levelId_tenantId_fkey ( number, labelEn ),
  Term!Subject_semesterId_tenantId_fkey ( number ),
  SubjectGrouping!Subject_groupingId_tenantId_fkey ( nameEn, nameFr ),
  SubjectSubBranch ( id, name, nameFr, coefficient, sortOrder )
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
  termId: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subSystem: string | null;
  branch: string | null;
  groupingId: string | null;
  Level: unknown;
  Term: unknown;
  SubjectGrouping: unknown;
  SubjectSubBranch?: {
    id: string;
    name: string;
    nameFr: string | null;
    coefficient: number | null;
    sortOrder: number;
  }[];
};

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const studentView = isStudent(session?.roleSlug);
  const { reactivateSubject } = useSubjectMutations();

  const { data, isLoading, isError, error } = useSupabaseRecord<SubjectDetail>(
    'Subject',
    id,
    SUBJECT_SELECT,
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
  const subjectSubSystem = data ? parseAcademicSubSystem(data.subSystem) : null;
  const subjectBranch = data ? parseAcademicBranch(data.branch) : null;
  const hasValidStream = subjectSubSystem !== null && subjectBranch !== null;
  const title = data?.code ? `Subject — ${data.code}` : t('subjects.details');

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
              {!studentView ? (
                <TabsTrigger value="classes">Classes</TabsTrigger>
              ) : null}
              {!studentView ? (
                <TabsTrigger value="teachers">Teachers</TabsTrigger>
              ) : null}
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
              {canManage && !isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Reactivate subject "${data.nameEn}"?`)) {
                      reactivateSubject.mutate(id);
                    }
                  }}
                >
                  Reactivate
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
                  { label: 'Name', value: formatRecordValue(data.nameEn) },
                  { label: 'Type', value: subjectTypeLabel(data.subjectType) },
                  { label: 'Coefficient', value: formatRecordValue(data.coefficient) },
                  {
                    label: 'Grouping',
                    value: formatRecordValue(grouping?.nameEn),
                  },
                  {
                    label: 'Sub-branches',
                    value: formatSubBranchDisplayNames(subBranches, 10),
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
                  {
                    label: 'Sub-system / branch',
                    value: streamLabel(data.subSystem, data.branch),
                  },
                  { label: 'Level', value: levelLabel(level) },
                  { label: 'Term', value: subjectTermScopeLabel(term, data?.termId) },
                ]}
              />
            </div>
          </TabsContent>

          {!studentView ? (
            <TabsContent value="classes">
              {hasValidStream ? (
                <SubjectClassAssignmentPanel
                  subjectId={id}
                  subSystem={subjectSubSystem}
                  branch={subjectBranch}
                  subjectDefaultGroupingId={data.groupingId}
                  subjectDefaultGroupingName={grouping?.nameEn ?? null}
                  subBranches={subBranches.map((branch) => ({
                    id: branch.id,
                    name: branch.name,
                  }))}
                  canManage={canManage && isActive}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Class assignments require a valid sub-system and branch on this subject.
                  Edit the subject to set its academic stream before assigning classes.
                </p>
              )}
            </TabsContent>
          ) : null}

          {!studentView ? (
            <TabsContent value="teachers">
              <SubjectAssignmentPanel subjectId={id} canManage={canManage} />
            </TabsContent>
          ) : null}

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
