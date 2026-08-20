'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CopyRequestListStatusFilter } from '@/lib/acadia/transcripts';
import { useTranslation } from '@/hooks/useTranslation';

export function CopyRequestListToolbar({
  status,
  onStatusChange,
  yearScope,
  onYearScopeChange,
}: {
  status: CopyRequestListStatusFilter;
  onStatusChange: (status: CopyRequestListStatusFilter) => void;
  yearScope: 'all' | 'selected';
  onYearScopeChange: (scope: 'all' | 'selected') => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={status}
        onValueChange={(value) =>
          onStatusChange(value as CopyRequestListStatusFilter)
        }
      >
        <SelectTrigger className="w-[180px]" aria-label={t('transcripts.filterStatus')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">{t('transcripts.requestPending')}</SelectItem>
          <SelectItem value="FULFILLED">{t('transcripts.requestFulfilled')}</SelectItem>
          <SelectItem value="REJECTED">{t('transcripts.requestRejected')}</SelectItem>
          <SelectItem value="all">{t('transcripts.statusAll')}</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={yearScope}
        onValueChange={(value) =>
          onYearScopeChange(value as 'all' | 'selected')
        }
      >
        <SelectTrigger className="w-[200px]" aria-label={t('transcripts.filterYear')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('transcripts.allYears')}</SelectItem>
          <SelectItem value="selected">{t('transcripts.selectedYearStudents')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
