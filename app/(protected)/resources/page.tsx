'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ResourcesOverviewPanel } from '@/components/acadia/resources/resources-overview-panel';
import { Button } from '@/components/ui/button';

export default function ResourcesPage() {
  return (
    <AcadiaPageShell
      title="School resources"
      description="Inventory, allocations, and usage monitoring (FR-8.1.2, FR-8.1.3)."
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources/materials">Learning materials</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources/requests">Resource requests</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms">Rooms & facilities</Link>
        </Button>
      </div>
      <ResourcesOverviewPanel />
    </AcadiaPageShell>
  );
}
