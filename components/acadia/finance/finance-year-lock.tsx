'use client';

import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useTranslation } from '@/hooks/useTranslation';

export function useFinanceYearClosed(): boolean {
  const { activeYear } = useActiveAcademicYear();
  return activeYear?.isActive === false;
}

export function FinanceClosedYearHint() {
  const { t } = useTranslation();
  const yearClosed = useFinanceYearClosed();
  if (!yearClosed) {
    return null;
  }
  return <p className="text-sm text-muted-foreground">{t('finance.closedYearHint')}</p>;
}
