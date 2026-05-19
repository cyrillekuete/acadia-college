'use client';

import { Badge } from '@/components/ui/badge';
import {
  effectiveInstallmentStatus,
  feeInstallmentStatusLabel,
  type FeeInstallmentStatus,
} from '@/lib/acadia/finance';

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
  const effective = dueOn
    ? effectiveInstallmentStatus(status, dueOn)
    : (status as FeeInstallmentStatus);
  return (
    <Badge variant={VARIANT[effective] ?? 'secondary'} appearance="light">
      {feeInstallmentStatusLabel(effective)}
    </Badge>
  );
}
