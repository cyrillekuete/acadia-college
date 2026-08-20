'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TranscriptListStatusFilter } from '@/lib/acadia/transcripts';
import { useTranslation } from '@/hooks/useTranslation';

export function TranscriptListToolbar({
  status,
  onStatusChange,
}: {
  status: TranscriptListStatusFilter;
  onStatusChange: (status: TranscriptListStatusFilter) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={status}
        onValueChange={(value) =>
          onStatusChange(value as TranscriptListStatusFilter)
        }
      >
        <SelectTrigger className="w-[180px]" aria-label={t('transcripts.filterStatus')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ready">{t('transcripts.statusReady')}</SelectItem>
          <SelectItem value="not-issued">{t('transcripts.statusNotIssued')}</SelectItem>
          <SelectItem value="all">{t('transcripts.statusAll')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
