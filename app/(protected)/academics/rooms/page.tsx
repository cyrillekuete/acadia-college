'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { RoomAssignmentsPanel } from '@/components/acadia/resources/room-assignments-panel';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RoomRow = {
  id: string;
  code: string;
  nameEn: string;
  capacity?: number | null;
} & Record<string, unknown>;

const columns: ColumnDef<RoomRow>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'capacity', header: 'Capacity' },
];

export default function RoomsPage() {
  return (
    <AcadiaPageShell
      title="Rooms & facilities"
      description="Room registry, timetable assignments, usage, and maintenance."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms/usage">Facility usage</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms/maintenance">Maintenance</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/timetable">Timetable</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources">School resources</Link>
        </Button>
      </div>

      <Tabs defaultValue="registry" className="print:hidden">
        <TabsList>
          <TabsTrigger value="registry">Room registry</TabsTrigger>
          <TabsTrigger value="assignments">Classroom assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="registry" className="mt-4">
          <SupabaseTableList
            table="Room"
            title="Rooms"
            select="id, code, nameEn, nameFr, capacity, building, isActive"
            columns={columns}
            searchKeys={['code', 'nameEn']}
          />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <RoomAssignmentsPanel />
        </TabsContent>
      </Tabs>
    </AcadiaPageShell>
  );
}
