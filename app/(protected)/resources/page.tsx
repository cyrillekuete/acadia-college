'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ResourcesOverviewPanel } from '@/components/acadia/resources/resources-overview-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function ResourcesPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('resources.title')}
      description={t('resources.description')}
    >
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources/materials">{t('resources.materialsTitle')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources/requests">{t('resources.requestsTitle')}</Link>
        </Button>
      </div>
      <ResourcesOverviewPanel />
    </AcadiaPageShell>
  );
}
