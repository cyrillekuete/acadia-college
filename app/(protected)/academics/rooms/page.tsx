'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { RoomAssignmentsPanel } from '@/components/acadia/resources/room-assignments-panel';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('academics.roomsTitle')}
      description={t('academics.roomsDescription')}
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms/usage">{t('academics.usageTitle')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms/maintenance">{t('academics.maintenanceTitle')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/timetable">{t('timetable.title')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources">{t('resources.title')}</Link>
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
