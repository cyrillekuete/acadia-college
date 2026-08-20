'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import {
  SubjectGroupingFormDialog,
  type SubjectGroupingRow,
} from '@/components/acadia/subjects/subject-grouping-form-dialog';
import { SubjectGroupingsTable } from '@/components/acadia/subjects/subject-groupings-table';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useSubjectGroupingList } from '@/hooks/use-subject-grouping-list';
import { useSubjectGroupingMutations } from '@/hooks/use-subject-grouping-mutations';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function SubjectGroupingsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectGroupingRow | null>(null);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteAcademicAdmin(session?.roleSlug);
  const { deleteGrouping } = useSubjectGroupingMutations();
  const { data = [], isLoading, isError, error } = useSubjectGroupingList();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <AcadiaPageShell
      title={t('subjects.groupingsTitle')}
      description={t('subjects.groupingsDescription')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/subjects">{t('subjects.backToSubjects')}</Link>
        </Button>
        {canManage ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t('subjects.newGrouping')}
          </Button>
        ) : null}
      </div>

      <SubjectGroupingsTable
        data={data}
        isLoading={isLoading}
        isError={isError}
        error={error}
        canManage={canManage}
        highlightId={highlightId}
        onCreate={canManage ? openCreate : undefined}
        onEdit={(row) => {
          setEditing({
            id: row.id,
            nameEn: row.nameEn,
            nameFr: row.nameFr,
            code: row.code,
            sortOrder: row.sortOrder,
          });
          setDialogOpen(true);
        }}
        onDelete={(row) => {
          const parts: string[] = [];
          if (row.subjectCount > 0) {
            parts.push(t('subjects.unlinkSubjectsNote', { count: row.subjectCount }));
          }
          if (row.inactiveSubjectCount > 0) {
            parts.push(
              t('subjects.unlinkInactiveSubjectsNote', {
                count: row.inactiveSubjectCount,
              }),
            );
          }
          if (row.classOverrideCount > 0) {
            parts.push(
              t('subjects.unlinkClassOverridesNote', {
                count: row.classOverrideCount,
              }),
            );
          }
          const unlinkNote = parts.length > 0 ? ` ${parts.join(' ')}` : '';
          if (
            window.confirm(
              `${t('subjects.deleteGroupingConfirm', { name: row.nameEn })}${unlinkNote}`,
            )
          ) {
            deleteGrouping.mutate(row.id);
          }
        }}
      />

      <SubjectGroupingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
