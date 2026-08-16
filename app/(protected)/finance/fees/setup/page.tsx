'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FeePlansPanel } from '@/components/acadia/finance/fee-plans-panel';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function FeePlanSetupPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);

  if (!canManage) {
    return (
      <AcadiaPageShell
        title={t('finance.setupTitle')}
        description={t('common.messages.accessDenied')}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/fees">{t('finance.backToFees')}</Link>
        </Button>
      </AcadiaPageShell>
    );
  }

  return (
    <AcadiaPageShell
      title={t('finance.setupTitle')}
      description={t('finance.setupDescription')}
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/fees">{t('finance.backToFees')}</Link>
        </Button>
      </div>
      <FeePlansPanel />
    </AcadiaPageShell>
  );
}
