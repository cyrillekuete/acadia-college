import { branchLabel } from '@/lib/acadia/education-system';
import { formatMoney } from '@/i18n/format';

export function studentBranchLabel(branch: string | null | undefined): string {
  if (!branch) {
    return '—';
  }
  return branchLabel(branch.toUpperCase());
}

export function studentFeesStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return 'Pending';
  }
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export type StudentFeesStatusVariant =
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive';

export function studentFeesStatusVariant(
  status: string | null | undefined,
  paidFees: number,
  totalFees: number,
): StudentFeesStatusVariant {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'paid' || (totalFees > 0 && paidFees >= totalFees)) {
    return 'success';
  }
  if (normalized === 'partial' || (paidFees > 0 && paidFees < totalFees)) {
    return 'warning';
  }
  if (normalized === 'overdue') {
    return 'destructive';
  }
  return 'secondary';
}

export function formatStudentFeesAmounts(
  paidFees: number,
  totalFees: number,
): string | null {
  if (totalFees <= 0 && paidFees <= 0) {
    return null;
  }
  return `${formatMoney(paidFees)} / ${formatMoney(totalFees)}`;
}
