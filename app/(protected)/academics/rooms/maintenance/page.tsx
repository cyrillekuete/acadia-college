'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { RoomMaintenancePanel } from '@/components/acadia/resources/room-maintenance-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function RoomMaintenancePage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('academics.maintenanceTitle')}
      description="Schedule and track facility maintenance (FR-8.2.3)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/rooms">Back to rooms</Link>
        </Button>
      </div>
      <RoomMaintenancePanel />
    </AcadiaPageShell>
  );
}
