'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { RoomUsagePanel } from '@/components/acadia/resources/room-usage-panel';
import { Button } from '@/components/ui/button';

export default function RoomUsagePage() {
  return (
    <AcadiaPageShell
      title="Facility usage"
      description="Weekly timetable utilization per room (FR-8.2.2)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms">Back to rooms</Link>
        </Button>
      </div>
      <RoomUsagePanel />
    </AcadiaPageShell>
  );
}
