'use client';

import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  type CatalogFilters,
  branchLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
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
        <SelectTrigger className="w-[200px]" aria-label="Sub-system filter">
          <SelectValue placeholder="All sub-systems" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All sub-systems</SelectItem>
          {ACADEMIC_SUB_SYSTEMS.map((value) => (
            <SelectItem key={value} value={value}>
              {subSystemLabel(value)}
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
        <SelectTrigger className="w-[180px]" aria-label="Branch filter">
          <SelectValue placeholder="All branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All branches</SelectItem>
          {ACADEMIC_BRANCHES.map((value) => (
            <SelectItem key={value} value={value}>
              {branchLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
