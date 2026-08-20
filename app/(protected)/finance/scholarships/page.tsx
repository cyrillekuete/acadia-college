'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ScholarshipsPanel } from '@/components/acadia/finance/scholarships-panel';
import { useTranslation } from '@/hooks/useTranslation';

export default function FinanceScholarshipsPage() {
  const { t } = useTranslation();
  return (
    <AcadiaPageShell
      title={t('finance.scholarshipsTitle')}
      description={t('finance.scholarshipsDescription')}
    >
      <ScholarshipsPanel />
    </AcadiaPageShell>
  );
}
