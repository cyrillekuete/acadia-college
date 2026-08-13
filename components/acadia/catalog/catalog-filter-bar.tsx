'use client';

import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  type CatalogFilters,
} from '@/lib/acadia/education-system';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CatalogFilterBar({
  filters,
  onChange,
}: {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Select
        value={filters.subSystem ?? '__all__'}
        onValueChange={(value) =>
          onChange({
            ...filters,
            subSystem: value === '__all__' ? null : (value as CatalogFilters['subSystem']),
          })
        }
      >
        <SelectTrigger className="w-[200px]" aria-label={t('catalog.subSystemFilter')}>
          <SelectValue placeholder={t('catalog.allSubSystems')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('catalog.allSubSystems')}</SelectItem>
          {ACADEMIC_SUB_SYSTEMS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`catalog.subSystem.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.branch ?? '__all__'}
        onValueChange={(value) =>
          onChange({
            ...filters,
            branch: value === '__all__' ? null : (value as CatalogFilters['branch']),
          })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label={t('catalog.branchFilter')}>
          <SelectValue placeholder={t('catalog.allBranches')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('catalog.allBranches')}</SelectItem>
          {ACADEMIC_BRANCHES.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`catalog.branch.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
