'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ArrowRightLeft, Star } from 'lucide-react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicYearFormDialog } from '@/components/acadia/academics/academic-year-form-dialog';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { RegistryRowActions } from '@/components/acadia/academics/row-actions';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { useAcademicCalendarMutations } from '@/hooks/use-academic-calendar-mutations';

type Row = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  isActive: boolean;
};

export default function AcademicYearsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const { setAcademicYearCurrent } = useAcademicCalendarMutations();

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'label', header: 'Label' },
      { accessorKey: 'startsOn', header: 'Starts' },
      { accessorKey: 'endsOn', header: 'Ends' },
      {
        accessorKey: 'isCurrent',
        header: 'Current',
        cell: ({ row }) => formatRecordValue(row.original.isCurrent),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {!row.original.isCurrent ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Set as current year"
                disabled={setAcademicYearCurrent.isPending}
                onClick={() => setAcademicYearCurrent.mutate(row.original.id)}
              >
                <Star className="size-4" />
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" title="Year rollover" asChild>
              <Link href={`/academics/years/${row.original.id}/rollover`}>
                <ArrowRightLeft className="size-4" />
              </Link>
            </Button>
            <RegistryRowActions
              onEdit={() => {
                setEditing(row.original);
                setDialogOpen(true);
              }}
            />
          </div>
        ),
      },
    ],
    [setAcademicYearCurrent],
  );

  return (
    <AcadiaPageShell
      title="Acadia College — Academic years"
      description="Define school years and set the current year. New years auto-provision three terms and six sequences."
    >
      <AdminToolbar
        addLabel="New academic year"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />
      <SupabaseTableList
        table="AcademicYear"
        title="Academic years"
        select="id, label, startsOn, endsOn, isCurrent, isActive"
        columns={columns}
        searchKeys={['label']}
      />
      <AcademicYearFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
      />
    </AcadiaPageShell>
  );
}
