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
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  branchLabel,
  subSystemLabel,
} from '@/lib/acadia/education-system';
import {
  EMPTY_STUDENT_REGISTRY_FILTERS,
  STUDENT_QUICK_FILTERS,
  studentRegistryHasActiveFilters,
  type StudentQuickFilterId,
  type StudentRegistryFilters,
} from '@/lib/acadia/student-registry';
import { StudentEnrollmentStatusProps } from '@/components/acadia/student/student-list-status';
import { cn } from '@/lib/utils';

const ALL = '__all__';

export function StudentRegistryFiltersPanel({
  filters,
  onChange,
  classOptions,
  feesStatusOptions,
}: {
  filters: StudentRegistryFilters;
  onChange: (filters: StudentRegistryFilters) => void;
  classOptions: string[];
  feesStatusOptions: string[];
}) {
  const quickFilters: RegistryQuickFilter[] = STUDENT_QUICK_FILTERS;

  const handleClearAll = () => {
    onChange({ ...EMPTY_STUDENT_REGISTRY_FILTERS });
  };

  return (
    <RegistryFilterCard
      onClearAll={handleClearAll}
      hasActiveFilters={studentRegistryHasActiveFilters(filters)}
      quickFilters={quickFilters}
      activeQuickFilter={filters.quickFilter}
      onQuickFilterChange={(id) =>
        onChange({
          ...filters,
          quickFilter: id as StudentQuickFilterId | null,
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

        <FilterField label="Branch" className="min-w-[10rem] flex-1">
          <Select
            value={filters.branch ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                branch: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All branches</SelectItem>
              {ACADEMIC_BRANCHES.map((value) => (
                <SelectItem key={value} value={value}>
                  {branchLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Class" className="min-w-[10rem] flex-1">
          <Select
            value={filters.className ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                className: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {classOptions.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Status" className="min-w-[10rem] flex-1">
          <Select
            value={filters.enrollmentStatus ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                enrollmentStatus: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(StudentEnrollmentStatusProps).map(
                ([status, { label }]) => (
                  <SelectItem key={status} value={status}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Fees Status" className="min-w-[10rem] flex-1">
          <Select
            value={filters.feesStatus ?? ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                feesStatus: value === ALL ? null : value,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All fees status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All fees status</SelectItem>
              {feesStatusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
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
