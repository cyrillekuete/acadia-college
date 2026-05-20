'use client';

import type { ReactNode } from 'react';
import { Search } from '@/lib/icons';
import {
  RegistryFilterCard,
  type RegistryQuickFilter,
} from '@/components/acadia/registry/registry-filter-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACADEMIC_SUB_SYSTEMS,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import {
  EMPTY_STAFF_REGISTRY_FILTERS,
  STAFF_QUICK_FILTERS,
  staffRegistryHasActiveFilters,
  type StaffQuickFilterId,
  type StaffRegistryFilters,
} from '@/lib/acadia/staff-registry';
import { cn } from '@/lib/utils';

const ALL = '__all__';

export function StaffRegistryFiltersPanel({
  filters,
  onChange,
  subjectOptions,
}: {
  filters: StaffRegistryFilters;
  onChange: (filters: StaffRegistryFilters) => void;
  subjectOptions: string[];
}) {
  const quickFilters: RegistryQuickFilter[] = STAFF_QUICK_FILTERS;

  return (
    <RegistryFilterCard
      onClearAll={() => onChange({ ...EMPTY_STAFF_REGISTRY_FILTERS })}
      hasActiveFilters={staffRegistryHasActiveFilters(filters)}
      quickFilters={quickFilters}
      activeQuickFilter={filters.quickFilter}
      onQuickFilterChange={(id) =>
        onChange({
          ...filters,
          quickFilter: id as StaffQuickFilterId | null,
        })
      }
    >
      <div className="flex flex-wrap items-end gap-4 lg:flex-nowrap">
        <FilterField label="Search" className="min-w-[min(100%,280px)] flex-[1.4]">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center text-muted-foreground">
              <Search className="size-4 shrink-0" />
            </div>
            <Input
              placeholder="Search by name, ID, email…"
              value={filters.query}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              className="w-full ps-9"
            />
          </div>
        </FilterField>

        <FilterField label="Sub-system" className="min-w-[10rem] flex-1">
          <Select
            value={filters.subSystem ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                subSystem: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All sub-systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sub-systems</SelectItem>
              {ACADEMIC_SUB_SYSTEMS.map((value) => (
                <SelectItem key={value} value={value}>
                  {subSystemLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Subject" className="min-w-[10rem] flex-1">
          <Select
            value={filters.subjectName ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                subjectName: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All subjects</SelectItem>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Status" className="min-w-[10rem] flex-1">
          <Select
            value={filters.activeStatus ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                activeStatus: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </div>
    </RegistryFilterCard>
  );
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
