'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CatalogFilterBar } from '@/components/acadia/catalog/catalog-filter-bar';
import { useClassList } from '@/hooks/use-class-list';
import { useTranslation } from '@/hooks/useTranslation';
import {
  mergeFeePlanClassSelection,
  pruneFeePlanClassSelection,
} from '@/lib/acadia/finance';
import {
  type CatalogFilters,
} from '@/lib/acadia/education-system';

export function FeePlanClassMultiSelect({
  value,
  onChange,
  assignedElsewhere,
  filters,
  onFiltersChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  assignedElsewhere: Set<string>;
  filters: CatalogFilters;
  onFiltersChange: (filters: CatalogFilters) => void;
}) {
  const { t } = useTranslation();
  const { data: classes = [], isLoading } = useClassList({
    subSystem: filters.subSystem,
    branch: filters.branch,
  });

  const availableIds = classes
    .filter((row) => !assignedElsewhere.has(row.id) || value.includes(row.id))
    .map((row) => row.id);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const next = pruneFeePlanClassSelection(
      value,
      classes.map((row) => row.id),
      filters,
    );
    if (next.length !== value.length) {
      onChange(next);
    }
  }, [isLoading, classes, filters, value, onChange]);

  return (
    <div className="space-y-3">
      <CatalogFilterBar
        filters={filters}
        onChange={onFiltersChange}
        className="mb-0"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('nav.classes')}</p>
        {classes.length > 0 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() =>
                onChange(mergeFeePlanClassSelection(value, availableIds, classes))
              }
            >
              {t('academics.selectAll')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => onChange([])}
            >
              {t('academics.clearSelection')}
            </Button>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('finance.loadingClasses')}</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('academics.noClassesMatch')}</p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
          {classes.map((row) => {
            const taken = assignedElsewhere.has(row.id) && !value.includes(row.id);
            const checked = value.includes(row.id);
            return (
              <label
                key={row.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  disabled={taken}
                  onCheckedChange={(next) => {
                    if (next === true) {
                      onChange(mergeFeePlanClassSelection(value, [row.id], classes));
                    } else {
                      onChange(value.filter((id) => id !== row.id));
                    }
                  }}
                />
                <span className={taken ? 'text-muted-foreground' : undefined}>
                  {row.name}
                  {taken ? ` — ${t('finance.classAlreadyAssigned')}` : ''}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
