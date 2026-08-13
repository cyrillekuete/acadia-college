'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ResourceRequestsPanel } from '@/components/acadia/resources/resource-requests-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function ResourceRequestsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('resources.requestsTitle')}
      description="Request and approve shared school equipment and materials (FR-8.1.4)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources">Back to resources</Link>
        </Button>
      </div>
      <ResourceRequestsPanel />
    </AcadiaPageShell>
  );
}
