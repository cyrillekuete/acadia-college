'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import {
  SubjectGroupingFormDialog,
  type SubjectGroupingRow,
} from '@/components/acadia/subjects/subject-grouping-form-dialog';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useSubjectGroupingMutations } from '@/hooks/use-subject-grouping-mutations';
import { isAdmin } from '@/lib/acadia/roles';

export default function SubjectGroupingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectGroupingRow | null>(null);
  const { data: session } = useAcadiaCollegeSession();
  const canManage = isAdmin(session?.roleSlug);
  const { deleteGrouping } = useSubjectGroupingMutations();

  const columns = useMemo<ColumnDef<SubjectGroupingRow>[]>(
    () => [
      { accessorKey: 'nameEn', header: 'Name (EN)' },
      { accessorKey: 'nameFr', header: 'Name (FR)' },
      { accessorKey: 'code', header: 'Code' },
      { accessorKey: 'sortOrder', header: 'Sort order' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <RegistryRowActions
            onEdit={() => {
              setEditing(row.original);
              setDialogOpen(true);
            }}
            onDelete={() => {
              if (
                window.confirm(`Delete grouping "${row.original.nameEn}"? Subjects will be unlinked.`)
              ) {
                deleteGrouping.mutate(row.original.id);
              }
            }}
          />
        ),
      },
    ],
    [deleteGrouping],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Subject groupings"
      description="Define optional groupings that subjects can belong to (e.g. science block, languages)."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/subjects">Back to subjects</Link>
        </Button>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            New grouping
          </Button>
        ) : null}
      </div>

      <SupabaseTableList<SubjectGroupingRow>
        table="SubjectGrouping"
        title="Groupings"
        select="id, nameEn, nameFr, code, sortOrder"
        columns={columns}
        searchKeys={['nameEn', 'nameFr', 'code']}
      />

      <SubjectGroupingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
