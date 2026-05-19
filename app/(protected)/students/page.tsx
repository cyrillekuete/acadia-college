'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

type Row = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  matricule_number: string | null;
  class_name: string | null;
  enrollment_status: string | null;
  status: string | null;
};

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: 'student_id',
    header: 'Student ID',
    cell: ({ row }) => (
      <Link
        href={`/students/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.student_id}
      </Link>
    ),
  },
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) =>
      `${row.original.first_name} ${row.original.last_name}`,
  },
  {
    accessorKey: 'matricule_number',
    header: 'Matricule',
    cell: ({ row }) => row.original.matricule_number ?? '—',
  },
  {
    accessorKey: 'class_name',
    header: 'Class',
    cell: ({ row }) => row.original.class_name ?? '—',
  },
  {
    accessorKey: 'enrollment_status',
    header: 'Enrolment',
    cell: ({ row }) => {
      const s = row.original.enrollment_status ?? 'pending';
      return (
        <Badge
          variant={s === 'active' ? 'success' : s === 'pending' ? 'warning' : 'secondary'}
          appearance="light"
          className="capitalize"
        >
          {s}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status ?? 'active';
      return (
        <Badge
          variant={s === 'active' ? 'success' : 'secondary'}
          appearance="light"
          className="capitalize"
        >
          {s}
        </Badge>
      );
    },
  },
];

export default function StudentsPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Students"
      description="Manage student accounts and records."
      actions={
        canAdd ? (
          <Button asChild size="sm">
            <Link href="/students/new">
              <Plus className="size-4" />
              Add student
            </Link>
          </Button>
        ) : undefined
      }
    >
      <SupabaseTableList
        table="students"
        title="Student registry"
        select="id, student_id, first_name, last_name, matricule_number, class_name, enrollment_status, status"
        tenantColumn="tenant_id"
        columns={columns}
        searchKeys={['student_id', 'first_name', 'last_name', 'matricule_number']}
      />
    </AcadiaPageShell>
  );
}
