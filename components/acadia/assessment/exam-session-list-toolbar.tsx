'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXAM_SESSION_TYPES } from '@/lib/acadia/assessment';
import type { TermOption } from '@/hooks/use-academic-calendar-options';
import {
  type ExamSessionListFilters,
  type ExamSessionListStatusFilter,
} from '@/lib/acadia/exam-session-list';
import { useTranslation } from '@/hooks/useTranslation';

const ALL = '__all__';

export function ExamSessionListToolbar({
  filters,
  onChange,
  terms,
}: {
  filters: ExamSessionListFilters;
  onChange: (filters: ExamSessionListFilters) => void;
  terms: TermOption[];
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={filters.type || ALL}
        onValueChange={(value) =>
          onChange({ ...filters, type: value === ALL ? '' : value })
        }
      >
        <SelectTrigger className="w-[160px]" aria-label={t('exams.filterType')}>
          <SelectValue placeholder={t('exams.allTypes')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('exams.allTypes')}</SelectItem>
          {EXAM_SESSION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {t(`exams.type.${type}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.termId || ALL}
        onValueChange={(value) =>
          onChange({ ...filters, termId: value === ALL ? '' : value })
        }
      >
        <SelectTrigger className="w-[160px]" aria-label={t('exams.filterTerm')}>
          <SelectValue placeholder={t('exams.allTerms')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('exams.allTerms')}</SelectItem>
          {terms.map((term) => (
            <SelectItem key={term.id} value={term.id}>
              {t('catalog.termN', { number: term.number })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status}
        onValueChange={(value) =>
          onChange({
            ...filters,
            status: value as ExamSessionListStatusFilter,
          })
        }
      >
        <SelectTrigger className="w-[160px]" aria-label={t('exams.filterStatus')}>
          <SelectValue placeholder={t('exams.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('exams.allStatuses')}</SelectItem>
          <SelectItem value="open">{t('exams.openSessions')}</SelectItem>
          <SelectItem value="finalized">{t('exams.finalizedSessions')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
