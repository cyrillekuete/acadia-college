'use client';

import { Badge } from '@/components/ui/badge';
import {
  effectiveInstallmentStatus,
  type FeeInstallmentStatus,
} from '@/lib/acadia/finance';
import { useTranslation } from '@/hooks/useTranslation';

const VARIANT: Record<
  FeeInstallmentStatus,
  'secondary' | 'success' | 'destructive' | 'warning'
> = {
  PENDING: 'secondary',
  PAID: 'success',
  OVERDUE: 'destructive',
  WAIVED: 'warning',
};

export function FeeStatusBadge({
  status,
  dueOn,
}: {
  status: string;
  dueOn?: string;
}) {
  const { t } = useTranslation();
  const effective = dueOn
    ? effectiveInstallmentStatus(status, dueOn)
    : (status as FeeInstallmentStatus);
  return (
    <Badge variant={VARIANT[effective] ?? 'secondary'} appearance="light">
      {t(`finance.status.${effective}`, { defaultValue: effective })}
    </Badge>
  );
}
